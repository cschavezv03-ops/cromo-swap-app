import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cancelListing,
  closeAuction,
  createAuctionListing,
  createPackageListing,
  createSaleListing,
  fetchActiveListings,
  fetchListingDetail,
  fetchMyListings,
  pauseListing,
  resumeListing,
  type CreateAuctionInput,
  type CreatePackageInput,
  type CreateSaleInput,
  type ListingFilters,
} from '../data/listings';

const KEYS = {
  active: (filters: ListingFilters) => ['marketplace', 'active', filters] as const,
  detail: (id: string) => ['marketplace', 'detail', id] as const,
  mine: () => ['marketplace', 'mine'] as const,
};

export function useActiveListings(filters: ListingFilters) {
  return useQuery({
    queryKey: KEYS.active(filters),
    queryFn: () => fetchActiveListings(filters),
    staleTime: 1000 * 30,
  });
}

export function useListingDetail(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.detail(id ?? 'none'),
    enabled: Boolean(id),
    queryFn: () => fetchListingDetail(id as string),
    staleTime: 1000 * 15,
  });
}

export function useMyListings() {
  return useQuery({
    queryKey: KEYS.mine(),
    queryFn: fetchMyListings,
    staleTime: 1000 * 30,
  });
}

function invalidateAllListings(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['marketplace'] });
}

export function useCreateSaleListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSaleInput) => createSaleListing(input),
    onSuccess: () => invalidateAllListings(qc),
  });
}

export function useCreatePackageListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePackageInput) => createPackageListing(input),
    onSuccess: () => invalidateAllListings(qc),
  });
}

export function useCreateAuctionListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAuctionInput) => createAuctionListing(input),
    onSuccess: () => invalidateAllListings(qc),
  });
}

export function usePauseListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listingId: string) => pauseListing(listingId),
    onSuccess: () => invalidateAllListings(qc),
  });
}

export function useResumeListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listingId: string) => resumeListing(listingId),
    onSuccess: () => invalidateAllListings(qc),
  });
}

export function useCancelListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listingId: string) => cancelListing(listingId),
    onSuccess: () => invalidateAllListings(qc),
  });
}

export function useCloseAuction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listingId: string) => closeAuction(listingId),
    onSuccess: () => invalidateAllListings(qc),
  });
}

export const marketplaceQueryKeys = KEYS;
