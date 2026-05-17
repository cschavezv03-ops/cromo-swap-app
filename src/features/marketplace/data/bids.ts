import { supabase } from '@/lib/supabase';
import type { Tables } from '@/shared/types/database';

export type AuctionBid = Tables<'auction_bids'> & {
  bidder: Pick<Tables<'profiles'>, 'id' | 'display_name' | 'university'> | null;
};

export async function placeBid(args: {
  listingId: string;
  amount: number;
}): Promise<string> {
  const { data, error } = await supabase.rpc('fn_place_bid', {
    p_listing_id: args.listingId,
    p_amount: args.amount,
  });
  if (error) throw error;
  if (!data) throw new Error('No se pudo registrar la oferta.');
  return data as string;
}

/** Compra inmediata de una subasta al precio `buy_now_price`. Devuelve el transaction_id. */
export async function buyNowAuction(listingId: string): Promise<string> {
  const { data, error } = await supabase.rpc('fn_buy_now_auction', {
    p_listing_id: listingId,
  });
  if (error) throw error;
  if (!data) throw new Error('No se pudo procesar la compra.');
  return data as string;
}

export async function fetchBidsForListing(listingId: string): Promise<AuctionBid[]> {
  const { data, error } = await supabase
    .from('auction_bids')
    .select('*')
    .eq('listing_id', listingId)
    .order('amount', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as Tables<'auction_bids'>[];
  if (rows.length === 0) return [];

  const bidderIds = Array.from(new Set(rows.map((r) => r.bidder_id)));
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, display_name, university')
    .in('id', bidderIds);
  if (pErr) throw pErr;

  const byId = new Map(
    ((profiles ?? []) as Pick<Tables<'profiles'>, 'id' | 'display_name' | 'university'>[]).map(
      (p) => [p.id, p],
    ),
  );
  return rows.map((b) => ({ ...b, bidder: byId.get(b.bidder_id) ?? null }));
}

export async function fetchMyBids(): Promise<Tables<'auction_bids'>[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];

  const { data, error } = await supabase
    .from('auction_bids')
    .select('*')
    .eq('bidder_id', uid)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Tables<'auction_bids'>[];
}
