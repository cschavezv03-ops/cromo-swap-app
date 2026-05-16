import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { applyInventoryDelta, bulkAddByPrintedCodes, setOwnedQuantity } from '../data/inventory';
import { albumQueryKey } from './useAlbumData';

export function useIncrementOwned() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cromoId: string) => {
      void Haptics.selectionAsync();
      return applyInventoryDelta({ cromo_id: cromoId, delta_owned: 1 });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: albumQueryKey });
    },
  });
}

export function useDecrementOwned() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cromoId: string) => {
      void Haptics.selectionAsync();
      return applyInventoryDelta({ cromo_id: cromoId, delta_owned: -1 });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: albumQueryKey });
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

export function useMarkPasted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cromoId: string) => {
      // Move +1 from owned to pasted: net = owned same, pasted +1.
      return applyInventoryDelta({ cromo_id: cromoId, delta_pasted: 1 });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: albumQueryKey });
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
      void qc.invalidateQueries({ queryKey: albumQueryKey });
    },
  });
}
