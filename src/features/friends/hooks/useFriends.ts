import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { track } from '@/lib/observability';

import {
  fetchFriendshipStatus,
  fetchMyFriends,
  fetchPendingIn,
  fetchPendingOut,
  removeFriend,
  respondFriendRequest,
  sendFriendRequest,
} from '../data/friendships';

const KEY = ['friends'] as const;

export function useMyFriends() {
  return useQuery({
    queryKey: [...KEY, 'mine'],
    queryFn: fetchMyFriends,
    staleTime: 1000 * 30,
  });
}

export function usePendingIn() {
  return useQuery({
    queryKey: [...KEY, 'pendingIn'],
    queryFn: fetchPendingIn,
    staleTime: 1000 * 30,
    refetchOnMount: 'always',
  });
}

export function usePendingOut() {
  return useQuery({
    queryKey: [...KEY, 'pendingOut'],
    queryFn: fetchPendingOut,
    staleTime: 1000 * 30,
  });
}

export function useFriendshipStatus(otherId: string | null | undefined) {
  return useQuery({
    queryKey: [...KEY, 'status', otherId ?? 'none'],
    enabled: Boolean(otherId),
    queryFn: () => fetchFriendshipStatus(otherId!),
    staleTime: 1000 * 30,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['friends'] });
  // El perfil ajeno depende de friendship_status, refrescar
  void qc.invalidateQueries({ queryKey: ['other-profile'] });
}

export function useSendFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () => {
      track('friend_request_sent');
      invalidateAll(qc);
    },
  });
}

export function useRespondFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      response,
    }: {
      requestId: string;
      response: 'accepted' | 'rejected';
    }) => respondFriendRequest(requestId, response),
    onSuccess: (_data, variables) => {
      if (variables.response === 'accepted') {
        track('friend_accepted');
      } else {
        track('friend_rejected');
      }
      invalidateAll(qc);
    },
  });
}

export function useRemoveFriend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: removeFriend,
    onSuccess: () => {
      track('friend_removed');
      invalidateAll(qc);
    },
  });
}
