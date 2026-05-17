import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createRating,
  fetchMyRatingForTx,
  fetchRatingSummary,
} from '../data/ratings';

export function useMyRatingForTx(transactionId: string | null | undefined) {
  return useQuery({
    queryKey: ['ratings', 'mine', transactionId ?? 'none'],
    enabled: Boolean(transactionId),
    queryFn: () => fetchMyRatingForTx(transactionId!),
    staleTime: 1000 * 60,
  });
}

export function useRatingSummary(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['ratings', 'summary', userId ?? 'none'],
    enabled: Boolean(userId),
    queryFn: () => fetchRatingSummary(userId!),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createRating,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ratings'] });
    },
  });
}
