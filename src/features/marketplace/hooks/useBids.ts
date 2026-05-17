import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { buyNowAuction, fetchBidsForListing, fetchMyBids, placeBid } from '../data/bids';

const KEYS = {
  forListing: (listingId: string) => ['marketplace', 'bids', listingId] as const,
  mine: () => ['marketplace', 'bids', 'mine'] as const,
};

export function useBidsForListing(listingId: string | undefined) {
  return useQuery({
    queryKey: KEYS.forListing(listingId ?? 'none'),
    enabled: Boolean(listingId),
    queryFn: () => fetchBidsForListing(listingId as string),
    staleTime: 1000 * 10,
  });
}

export function useMyBids() {
  return useQuery({
    queryKey: KEYS.mine(),
    queryFn: fetchMyBids,
    staleTime: 1000 * 30,
  });
}

export function usePlaceBid(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => placeBid({ listingId, amount }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.forListing(listingId) });
      void qc.invalidateQueries({ queryKey: ['marketplace', 'detail', listingId] });
      void qc.invalidateQueries({ queryKey: ['marketplace', 'active'] });
      void qc.invalidateQueries({ queryKey: KEYS.mine() });
    },
  });
}

export function useBuyNowAuction(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => buyNowAuction(listingId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.forListing(listingId) });
      void qc.invalidateQueries({ queryKey: ['marketplace', 'detail', listingId] });
      void qc.invalidateQueries({ queryKey: ['marketplace', 'active'] });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
