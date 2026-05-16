import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { albumKeys, type InventoryItem } from './queries';

type SetOwnedArgs = {
  userId: string;
  cromoId: string;
  ownedQuantity: number;
  pastedQuantity?: number;
};

export function useSetInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, cromoId, ownedQuantity, pastedQuantity }: SetOwnedArgs) => {
      const owned = Math.max(0, Math.floor(ownedQuantity));
      const pasted = pastedQuantity != null ? Math.min(owned, Math.max(0, pastedQuantity)) : 0;
      const { data, error } = await supabase
        .from('inventory_items')
        .upsert(
          {
            user_id: userId,
            cromo_id: cromoId,
            owned_quantity: owned,
            pasted_quantity: pasted,
          },
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
      const idx = prev.findIndex((i) => i.cromo_id === cromoId);
      const owned = Math.max(0, Math.floor(ownedQuantity));
      const pasted = pastedQuantity != null ? Math.min(owned, Math.max(0, pastedQuantity)) : 0;
      const optimistic: InventoryItem =
        idx >= 0
          ? { ...prev[idx]!, owned_quantity: owned, pasted_quantity: pasted, updated_at: new Date().toISOString() }
          : {
              id: `optimistic-${cromoId}`,
              user_id: userId,
              cromo_id: cromoId,
              owned_quantity: owned,
              pasted_quantity: pasted,
              wanted_quantity: 0,
              status: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
      const next = idx >= 0 ? prev.map((i) => (i.cromo_id === cromoId ? optimistic : i)) : [...prev, optimistic];
      qc.setQueryData(albumKeys.inventory(userId), next);
      return { prev };
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(albumKeys.inventory(vars.userId), ctx.prev);
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: albumKeys.inventory(vars.userId) });
    },
  });
}
