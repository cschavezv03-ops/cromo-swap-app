import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
  });
}

export function useMyMatches(direction: MatchDirection) {
  return useQuery({
    queryKey: KEY.mine(direction),
    queryFn: () => fetchMyMatches(direction),
    staleTime: 1000 * 30,
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['matches'] });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export const matchesQueryKeys = KEY;
