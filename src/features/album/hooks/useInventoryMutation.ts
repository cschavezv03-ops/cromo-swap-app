import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { applyInventoryDelta, bulkAddByPrintedCodes, setOwnedQuantity } from '../data/inventory';
import type { AlbumCromo, AlbumData, AlbumStats } from '../lib/types';
import { albumQueryKey } from './useAlbumData';

function statusFor(owned: number): AlbumCromo['status'] {
  if (owned <= 0) return 'missing';
  if (owned === 1) return 'have';
  return 'repeated';
}

/** Recomputes section totals and global stats after an optimistic mutation. */
function patchAlbumCromo(
  data: AlbumData,
  cromoId: string,
  patch: (c: AlbumCromo) => AlbumCromo,
): AlbumData {
  const newSections = data.sections.map((section) => {
    let changed = false;
    const cromos = section.cromos.map((c) => {
      if (c.id !== cromoId) return c;
      changed = true;
      return patch(c);
    });
    if (!changed) return section;
    const haveCount = cromos.filter((c) => c.status !== 'missing').length;
    return { ...section, cromos, haveCount };
  });

  const stats: AlbumStats = { total: 0, have: 0, missing: 0, repeated: 0 };
  for (const s of newSections) {
    for (const c of s.cromos) {
      stats.total++;
      if (c.status === 'missing') stats.missing++;
      else if (c.status === 'repeated') stats.repeated++;
      else stats.have++;
    }
  }

  return { sections: newSections, stats };
}

type RollbackCtx = { prev?: AlbumData };

export function useIncrementOwned() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string, RollbackCtx>({
    mutationFn: async (cromoId: string) => {
      void Haptics.selectionAsync();
      return applyInventoryDelta({ cromo_id: cromoId, delta_owned: 1 });
    },
    onMutate: async (cromoId) => {
      await qc.cancelQueries({ queryKey: albumQueryKey });
      const prev = qc.getQueryData<AlbumData>(albumQueryKey);
      if (prev) {
        qc.setQueryData<AlbumData>(
          albumQueryKey,
          patchAlbumCromo(prev, cromoId, (c) => {
            const owned = c.owned + 1;
            return { ...c, owned, status: statusFor(owned), dirty: true };
          }),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(albumQueryKey, context.prev);
    },
  });
}

export function useDecrementOwned() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string, RollbackCtx>({
    mutationFn: async (cromoId: string) => {
      void Haptics.selectionAsync();
      return applyInventoryDelta({ cromo_id: cromoId, delta_owned: -1 });
    },
    onMutate: async (cromoId) => {
      await qc.cancelQueries({ queryKey: albumQueryKey });
      const prev = qc.getQueryData<AlbumData>(albumQueryKey);
      if (prev) {
        qc.setQueryData<AlbumData>(
          albumQueryKey,
          patchAlbumCromo(prev, cromoId, (c) => {
            const owned = Math.max(0, c.owned - 1);
            const pasted = Math.min(owned, c.pasted);
            return { ...c, owned, pasted, status: statusFor(owned), dirty: true };
          }),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(albumQueryKey, context.prev);
    },
  });
}

export function useSetOwned() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { cromoId: string; owned: number }) => {
      return setOwnedQuantity(input.cromoId, input.owned);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: albumQueryKey });
    },
  });
}

export function useToggleWanted() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, { cromoId: string; delta: number }, RollbackCtx>({
    mutationFn: async ({ cromoId, delta }) => {
      void Haptics.selectionAsync();
      return applyInventoryDelta({ cromo_id: cromoId, delta_wanted: delta });
    },
    onMutate: async ({ cromoId, delta }) => {
      await qc.cancelQueries({ queryKey: albumQueryKey });
      const prev = qc.getQueryData<AlbumData>(albumQueryKey);
      if (prev) {
        qc.setQueryData<AlbumData>(
          albumQueryKey,
          patchAlbumCromo(prev, cromoId, (c) => ({
            ...c,
            wanted: Math.max(0, c.wanted + delta),
            dirty: true,
          })),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(albumQueryKey, context.prev);
    },
  });
}

export function useMarkPasted() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string, RollbackCtx>({
    mutationFn: async (cromoId: string) => {
      return applyInventoryDelta({ cromo_id: cromoId, delta_pasted: 1 });
    },
    onMutate: async (cromoId) => {
      await qc.cancelQueries({ queryKey: albumQueryKey });
      const prev = qc.getQueryData<AlbumData>(albumQueryKey);
      if (prev) {
        qc.setQueryData<AlbumData>(
          albumQueryKey,
          patchAlbumCromo(prev, cromoId, (c) => ({
            ...c,
            pasted: Math.min(c.owned, c.pasted + 1),
            dirty: true,
          })),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(albumQueryKey, context.prev);
    },
  });
}

export function useBulkAddSobre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pairs: Array<{ cromo_id: string; count: number }>) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return bulkAddByPrintedCodes(pairs);
    },
    onSuccess: () => {
      // bulk afecta muchos cromos a la vez — refetch completo es más simple
      void qc.invalidateQueries({ queryKey: albumQueryKey });
    },
  });
}
