import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { blockUser, fetchMyBlocks, isBlocked, unblockUser } from '../data/blocks';

const KEY = ['profile', 'blocks'] as const;

export function useMyBlocks() {
  return useQuery({
    queryKey: KEY,
    queryFn: fetchMyBlocks,
    staleTime: 1000 * 30,
  });
}

export function useIsBlocked(targetUserId: string | null | undefined) {
  return useQuery({
    queryKey: ['profile', 'blocks', 'is', targetUserId ?? 'none'],
    enabled: Boolean(targetUserId),
    queryFn: () => isBlocked(targetUserId!),
    staleTime: 1000 * 30,
  });
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: blockUser,
    onSuccess: (_v, targetUserId) => {
      void qc.invalidateQueries({ queryKey: ['profile', 'blocks'] });
      void qc.invalidateQueries({ queryKey: ['matches'] });
      void qc.invalidateQueries({ queryKey: ['other-profile', targetUserId] });
    },
  });
}

export function useUnblockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: unblockUser,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['profile', 'blocks'] });
      void qc.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}
