import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { track } from '@/lib/observability';

import {
  fetchMatchSuggestions,
  fetchMyMatches,
  proposeMatch,
  respondMatch,
  type MatchDirection,
  type ProposeMatchArgs,
} from '../data/matches';
import { fetchMatchableCromos } from '../data/match-detail';

const KEY = {
  suggestions: ['matches', 'suggestions'] as const,
  mine: (dir: MatchDirection) => ['matches', 'mine', dir] as const,
  detail: (counterpartyId: string) => ['matches', 'detail', counterpartyId] as const,
};

export function useMatchSuggestions() {
  return useQuery({
    queryKey: KEY.suggestions,
    queryFn: fetchMatchSuggestions,
    staleTime: 1000 * 60,
    // Refetch automático cada 90s mientras la pantalla esté activa para que
    // los matches aparezcan sin pull-to-refresh, en caso de que realtime caiga.
    refetchInterval: 1000 * 90,
    refetchIntervalInBackground: false,
  });
}

export function useMyMatches(direction: MatchDirection) {
  return useQuery({
    queryKey: KEY.mine(direction),
    queryFn: () => fetchMyMatches(direction),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
    refetchIntervalInBackground: false,
  });
}

export function useMatchableCromos(counterpartyId: string | undefined) {
  return useQuery({
    queryKey: KEY.detail(counterpartyId ?? 'none'),
    enabled: Boolean(counterpartyId),
    queryFn: () => fetchMatchableCromos(counterpartyId as string),
    staleTime: 1000 * 30,
  });
}

export function useProposeMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: ProposeMatchArgs) => proposeMatch(args),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useRespondMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { matchId: string; response: 'accepted' | 'rejected' }) =>
      respondMatch(args),
    onSuccess: (_data, variables) => {
      track(variables.response === 'accepted' ? 'match_accepted' : 'match_rejected');
      void qc.invalidateQueries({ queryKey: ['matches'] });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export const matchesQueryKeys = KEY;
