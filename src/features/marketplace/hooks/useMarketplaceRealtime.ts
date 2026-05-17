import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';

/**
 * Suscripción realtime para el tab Mercado: cualquier INSERT/UPDATE/DELETE
 * en `listings` invalida la query de listings activos. No filtramos por
 * scope del lado de la suscripción porque las RLS recortan resultados
 * en el siguiente refetch.
 */
export function useMarketplaceRealtime(): void {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('rt-marketplace-listings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listings' },
        () => {
          void qc.invalidateQueries({ queryKey: ['marketplace', 'active'] });
          void qc.invalidateQueries({ queryKey: ['marketplace', 'mine'] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);
}

/**
 * Suscripción realtime focalizada en un solo listing: actualiza el
 * detalle del listing + sus bids cada vez que llega un INSERT en
 * `auction_bids` o un UPDATE en el `listings.id`.
 */
export function useListingDetailRealtime(listingId: string | undefined): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!listingId) return;
    const channel = supabase
      .channel(`rt-listing-${listingId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listings', filter: `id=eq.${listingId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ['marketplace', 'detail', listingId] });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'auction_bids',
          filter: `listing_id=eq.${listingId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ['marketplace', 'bids', listingId] });
          void qc.invalidateQueries({ queryKey: ['marketplace', 'detail', listingId] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [listingId, qc]);
}
