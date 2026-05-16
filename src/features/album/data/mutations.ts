import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { albumKeys, type InventoryItem } from './queries';

type SetExactArgs = {
  userId: string;
  cromoId: string;
  ownedQuantity: number;
  pastedQuantity?: number;
};

function clamp(n: number, min = 0, max = Number.MAX_SAFE_INTEGER) {
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function patchCache(
  prev: InventoryItem[],
  userId: string,
  cromoId: string,
  owned: number,
  pasted: number,
): InventoryItem[] {
  const idx = prev.findIndex((i) => i.cromo_id === cromoId);
  const now = new Date().toISOString();
  const patched: InventoryItem =
    idx >= 0
      ? { ...prev[idx]!, owned_quantity: owned, pasted_quantity: pasted, updated_at: now }
      : {
          id: `optimistic-${cromoId}`,
          user_id: userId,
          cromo_id: cromoId,
          owned_quantity: owned,
          pasted_quantity: pasted,
          wanted_quantity: 0,
          status: null,
          created_at: now,
          updated_at: now,
        };
  return idx >= 0 ? prev.map((i) => (i.cromo_id === cromoId ? patched : i)) : [...prev, patched];
}

// Single-cromo tap +1 (fast path). Optimistic, debounced via React Query.
export function useIncrementCromo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      cromoId,
      delta,
    }: {
      userId: string;
      cromoId: string;
      delta: number;
    }) => {
      const current =
        qc.getQueryData<InventoryItem[]>(albumKeys.inventory(userId))?.find(
          (i) => i.cromo_id === cromoId,
        ) ?? null;
      const owned = clamp((current?.owned_quantity ?? 0) + delta);
      const pasted = clamp(current?.pasted_quantity ?? 0, 0, owned);
      const { data, error } = await supabase
        .from('inventory_items')
        .upsert(
          { user_id: userId, cromo_id: cromoId, owned_quantity: owned, pasted_quantity: pasted },
          { onConflict: 'user_id,cromo_id' },
        )
        .select()
        .single();
      if (error) throw error;
      return data as InventoryItem;
    },
    onMutate: async ({ userId, cromoId, delta }) => {
      await qc.cancelQueries({ queryKey: albumKeys.inventory(userId) });
      const prev = qc.getQueryData<InventoryItem[]>(albumKeys.inventory(userId)) ?? [];
      const current = prev.find((i) => i.cromo_id === cromoId);
      const owned = clamp((current?.owned_quantity ?? 0) + delta);
      const pasted = clamp(current?.pasted_quantity ?? 0, 0, owned);
      qc.setQueryData(albumKeys.inventory(userId), patchCache(prev, userId, cromoId, owned, pasted));
      return { prev };
    },
    onError: (_e, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(albumKeys.inventory(vars.userId), ctx.prev);
    },
  });
}

// Exact-quantity set (used by the long-press sheet).
export function useSetInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, cromoId, ownedQuantity, pastedQuantity }: SetExactArgs) => {
      const owned = clamp(ownedQuantity);
      const pasted = clamp(pastedQuantity ?? 0, 0, owned);
      const { data, error } = await supabase
        .from('inventory_items')
        .upsert(
          { user_id: userId, cromo_id: cromoId, owned_quantity: owned, pasted_quantity: pasted },
          { onConflict: 'user_id,cromo_id' },
        )
        .select()
        .single();
      if (error) throw error;
      return data as InventoryItem;
    },
    onMutate: async ({ userId, cromoId, ownedQuantity, pastedQuantity }) => {
      await qc.cancelQueries({ queryKey: albumKeys.inventory(userId) });
      const prev = qc.getQueryData<InventoryItem[]>(albumKeys.inventory(userId)) ?? [];
      const owned = clamp(ownedQuantity);
      const pasted = clamp(pastedQuantity ?? 0, 0, owned);
      qc.setQueryData(albumKeys.inventory(userId), patchCache(prev, userId, cromoId, owned, pasted));
      return { prev };
    },
    onError: (_e, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(albumKeys.inventory(vars.userId), ctx.prev);
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: albumKeys.inventory(vars.userId) });
    },
  });
}

// Reset to zero (delete from inventory).
export function useResetCromo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, cromoId }: { userId: string; cromoId: string }) => {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('user_id', userId)
        .eq('cromo_id', cromoId);
      if (error) throw error;
    },
    onMutate: async ({ userId, cromoId }) => {
      await qc.cancelQueries({ queryKey: albumKeys.inventory(userId) });
      const prev = qc.getQueryData<InventoryItem[]>(albumKeys.inventory(userId)) ?? [];
      qc.setQueryData(
        albumKeys.inventory(userId),
        prev.filter((i) => i.cromo_id !== cromoId),
      );
      return { prev };
    },
    onError: (_e, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(albumKeys.inventory(vars.userId), ctx.prev);
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: albumKeys.inventory(vars.userId) });
    },
  });
}

// Bulk increment — used by the "Sobre" flow.
// counts: { cromoId: deltaQty }. Reads current values from the cache, computes new owned values,
// then upserts all in a single batch.
export function useBulkIncrement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      counts,
    }: {
      userId: string;
      counts: Record<string, number>;
    }) => {
      const entries = Object.entries(counts).filter(([, n]) => n > 0);
      if (entries.length === 0) return [];

      const current = qc.getQueryData<InventoryItem[]>(albumKeys.inventory(userId)) ?? [];
      const byCromo = new Map(current.map((i) => [i.cromo_id, i]));

      const payload = entries.map(([cromoId, delta]) => {
        const existing = byCromo.get(cromoId);
        const owned = clamp((existing?.owned_quantity ?? 0) + delta);
        const pasted = clamp(existing?.pasted_quantity ?? 0, 0, owned);
        return {
          user_id: userId,
          cromo_id: cromoId,
          owned_quantity: owned,
          pasted_quantity: pasted,
        };
      });

      const { data, error } = await supabase
        .from('inventory_items')
        .upsert(payload, { onConflict: 'user_id,cromo_id' })
        .select();
      if (error) throw error;
      return data as InventoryItem[];
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: albumKeys.inventory(vars.userId) });
    },
  });
}
