/**
 * Inventory helpers — getMyInventory, getAlbumCatalog, setQuantity, etc.
 *
 * All writes go through the authenticated `supabase` client (RLS guards own-row).
 * No service-role key. No PII in logs.
 *
 * Spec: R4-3-1..R4-3-6
 */
import { supabase } from './supabase';
import type { Database } from '@/types/database';

export type InventoryRow = Database['public']['Tables']['inventory_items']['Row'];
export type AlbumCatalogRow = Database['public']['Views']['cromo_with_country_rarity']['Row'];

/**
 * Fetch the full catalog from the cromo_with_country_rarity view, ordered by n.
 */
export async function getAlbumCatalog(): Promise<AlbumCatalogRow[]> {
  const { data, error } = await supabase
    .from('cromo_with_country_rarity')
    .select('*')
    .order('n', { ascending: true });

  if (error) {
    console.error('[inventory] getAlbumCatalog error:', error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Fetch all inventory rows for the current authenticated user.
 * Returns [] if no user is signed in.
 */
export async function getMyInventory(): Promise<InventoryRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    console.error('[inventory] getMyInventory error:', error.message);
    return [];
  }
  return data ?? [];
}

/**
 * UPSERT a quantity for a given cromo.
 * Validates quantity >= 0 and integer client-side (UX guard; DB CHECK is canonical).
 * Resolves with { error: null } on success, { error: Error } on failure.
 *
 * Never logs PII. Log format: `[inventory] setQuantity error: <message>`
 */
export async function setQuantity(
  cromoId: string,
  quantity: number
): Promise<{ error: Error | null }> {
  if (!Number.isInteger(quantity) || quantity < 0) {
    return { error: new Error('Invalid quantity') };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: new Error('Not authenticated') };
  }

  const { error } = await supabase
    .from('inventory_items')
    .upsert(
      { user_id: user.id, cromo_id: cromoId, quantity },
      { onConflict: 'user_id,cromo_id' }
    );

  if (error) {
    console.error('[inventory] setQuantity error:', error.message);
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Thin wrapper: decrement quantity, clamped at 0.
 * Caller passes current value from the TanStack Query cache — no extra read.
 */
export function decrementQuantity(
  cromoId: string,
  current: number
): Promise<{ error: Error | null }> {
  return setQuantity(cromoId, Math.max(0, current - 1));
}

/**
 * Thin wrapper: increment quantity.
 * Caller passes current value from the TanStack Query cache — no extra read.
 */
export function incrementQuantity(
  cromoId: string,
  current: number
): Promise<{ error: Error | null }> {
  return setQuantity(cromoId, current + 1);
}
