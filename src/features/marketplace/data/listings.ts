import { supabase } from '@/lib/supabase';
import type { Tables } from '@/shared/types/database';

export type ListingKind = 'sale' | 'auction' | 'package';
export type ListingStatus = 'active' | 'reserved' | 'completed' | 'cancelled';

/** Metadatos del catálogo asociados a un cromo del listing. */
export type ListingCromoMeta = {
  id: string;
  printed_code: string | null;
  display_name: string;
  player_name: string | null;
  jersey: number | null;
  section_code: string;
  section_number: number;
  country_code: string | null;
  country_name: string | null;
  flag_emoji: string | null;
  stripe: string | null;
  accent: string | null;
  rarity_label: string | null;
};

export type ListingItem = Tables<'listing_items'> & {
  catalog: ListingCromoMeta | null;
};

export type ListingSeller = Pick<
  Tables<'profiles'>,
  'id' | 'display_name' | 'university'
>;

export type ListingSummary = Tables<'listings'> & {
  items: ListingItem[];
  seller: ListingSeller | null;
};

export type ListingFilters = {
  kind?: ListingKind | 'all';
  country_code?: string | null;
  search?: string;
};

async function enrichItemsForListings(
  listingIds: string[],
): Promise<Map<string, ListingItem[]>> {
  const grouped = new Map<string, ListingItem[]>();
  if (listingIds.length === 0) return grouped;

  const { data: items, error } = await supabase
    .from('listing_items')
    .select('*')
    .in('listing_id', listingIds);
  if (error) throw error;
  const rows = (items ?? []) as Tables<'listing_items'>[];
  if (rows.length === 0) return grouped;

  const cromoIds = Array.from(new Set(rows.map((r) => r.cromo_id)));
  const { data: catalog, error: cErr } = await supabase
    .from('cromo_with_country_rarity')
    .select(
      'id, printed_code, display_name, player_name, jersey, section_code, section_number, country_code, country_name, flag_emoji, stripe, accent, rarity_label',
    )
    .in('id', cromoIds);
  if (cErr) throw cErr;

  const byId = new Map<string, ListingCromoMeta>(
    ((catalog ?? []) as ListingCromoMeta[]).map((c) => [c.id, c]),
  );

  for (const r of rows) {
    const enriched: ListingItem = { ...r, catalog: byId.get(r.cromo_id) ?? null };
    const arr = grouped.get(r.listing_id) ?? [];
    arr.push(enriched);
    grouped.set(r.listing_id, arr);
  }
  return grouped;
}

async function attachSellers(
  rows: Tables<'listings'>[],
): Promise<Map<string, ListingSeller>> {
  const sellerIds = Array.from(new Set(rows.map((r) => r.seller_id)));
  if (sellerIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, university')
    .in('id', sellerIds);
  if (error) throw error;
  return new Map(((data ?? []) as ListingSeller[]).map((p) => [p.id, p]));
}

/**
 * Trae listings activos visibles para el usuario. La RLS de `listings`
 * ya aplica el filtro de scope + bloqueos + estado, así que solo
 * añadimos el filtro de tipo / país / texto en cliente.
 */
export async function fetchActiveListings(
  filters: ListingFilters = {},
): Promise<ListingSummary[]> {
  const kind = filters.kind && filters.kind !== 'all' ? filters.kind : undefined;
  const search = filters.search?.trim().toLowerCase();

  let q = supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (kind) q = q.eq('kind', kind);

  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as Tables<'listings'>[];
  if (rows.length === 0) return [];

  const [itemsByListing, sellersById] = await Promise.all([
    enrichItemsForListings(rows.map((r) => r.id)),
    attachSellers(rows),
  ]);

  const enriched: ListingSummary[] = rows.map((r) => ({
    ...r,
    items: itemsByListing.get(r.id) ?? [],
    seller: sellersById.get(r.seller_id) ?? null,
  }));

  return enriched.filter((l) => {
    if (filters.country_code) {
      const has = l.items.some((it) => it.catalog?.country_code === filters.country_code);
      if (!has) return false;
    }
    if (search) {
      const hay = [
        l.description ?? '',
        l.items.map((it) => it.catalog?.player_name ?? '').join(' '),
        l.items.map((it) => it.catalog?.display_name ?? '').join(' '),
        l.items.map((it) => it.catalog?.country_name ?? '').join(' '),
        l.items.map((it) => it.catalog?.printed_code ?? '').join(' '),
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

/** Detalle completo de un listing por id. */
export async function fetchListingDetail(id: string): Promise<ListingSummary | null> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as Tables<'listings'>;
  const [itemsByListing, sellersById] = await Promise.all([
    enrichItemsForListings([row.id]),
    attachSellers([row]),
  ]);

  return {
    ...row,
    items: itemsByListing.get(row.id) ?? [],
    seller: sellersById.get(row.seller_id) ?? null,
  };
}

/** Mis listings (todos los estados). */
export async function fetchMyListings(): Promise<ListingSummary[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('seller_id', uid)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Tables<'listings'>[];
  if (rows.length === 0) return [];

  const [itemsByListing, sellersById] = await Promise.all([
    enrichItemsForListings(rows.map((r) => r.id)),
    attachSellers(rows),
  ]);

  return rows.map((r) => ({
    ...r,
    items: itemsByListing.get(r.id) ?? [],
    seller: sellersById.get(r.seller_id) ?? null,
  }));
}

// ============================================================================
// MUTATIONS (RPCs)
// ============================================================================

export type CreateSaleInput = {
  cromoId: string;
  price: number;
  negotiable: boolean;
  isPublic: boolean;
  scopeUniversities: string[];
  description?: string | null;
};

export async function createSaleListing(input: CreateSaleInput): Promise<string> {
  const { data, error } = await supabase.rpc('fn_create_sale_listing', {
    p_cromo_id: input.cromoId,
    p_price: input.price,
    p_negotiable: input.negotiable,
    p_is_public: input.isPublic,
    p_scope_universities: input.scopeUniversities,
    p_description: input.description ?? undefined,
  });
  if (error) throw error;
  if (!data) throw new Error('No se pudo crear la publicación.');
  return data as string;
}

export type PackageItemInput = { cromo_id: string; quantity: number };

export type CreatePackageInput = {
  items: PackageItemInput[];
  price: number;
  negotiable: boolean;
  isPublic: boolean;
  scopeUniversities: string[];
  description?: string | null;
};

export async function createPackageListing(input: CreatePackageInput): Promise<string> {
  if (input.items.length === 0) throw new Error('El lote no tiene cromos.');
  const { data, error } = await supabase.rpc('fn_create_package_listing', {
    p_items: input.items as unknown as object,
    p_price: input.price,
    p_negotiable: input.negotiable,
    p_is_public: input.isPublic,
    p_scope_universities: input.scopeUniversities,
    p_description: input.description ?? undefined,
  });
  if (error) throw error;
  if (!data) throw new Error('No se pudo crear el lote.');
  return data as string;
}

export type CreateAuctionInput = {
  cromoId: string;
  startPrice: number;
  durationHours: number;
  bidIncrement: number;
  buyNowPrice?: number | null;
  isPublic: boolean;
  scopeUniversities: string[];
  description?: string | null;
};

export async function createAuctionListing(input: CreateAuctionInput): Promise<string> {
  const { data, error } = await supabase.rpc('fn_create_auction_listing', {
    p_cromo_id: input.cromoId,
    p_start_price: input.startPrice,
    p_duration_hours: input.durationHours,
    p_bid_increment: input.bidIncrement,
    p_buy_now_price: input.buyNowPrice ?? undefined,
    p_is_public: input.isPublic,
    p_scope_universities: input.scopeUniversities,
    p_description: input.description ?? undefined,
  });
  if (error) throw error;
  if (!data) throw new Error('No se pudo crear la subasta.');
  return data as string;
}

export async function pauseListing(listingId: string): Promise<void> {
  const { error } = await supabase.rpc('fn_pause_listing', {
    p_listing_id: listingId,
  });
  if (error) throw error;
}

export async function resumeListing(listingId: string): Promise<void> {
  const { error } = await supabase.rpc('fn_resume_listing', {
    p_listing_id: listingId,
  });
  if (error) throw error;
}

export async function cancelListing(listingId: string): Promise<void> {
  const { error } = await supabase
    .from('listings')
    .update({ status: 'cancelled' })
    .eq('id', listingId);
  if (error) throw error;
}

export async function closeAuction(listingId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('fn_close_auction', {
    p_listing_id: listingId,
  });
  if (error) throw error;
  return (data as string | null) ?? null;
}
