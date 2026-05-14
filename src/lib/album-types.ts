/**
 * Shared types for the album + inventory layer.
 * Combines catalog view row with inventory state.
 *
 * The cromo_with_country_rarity view returns nullable columns (Supabase convention
 * for views), but for active catalog items all fields are guaranteed non-null.
 * We use a refined type here so UI code avoids constant null-guards.
 */
import type { Database } from '@/types/database';
import type { RarityKey } from '@/theme';

export type AlbumCatalogRow = Database['public']['Views']['cromo_with_country_rarity']['Row'];
export type InventoryRow = Database['public']['Tables']['inventory_items']['Row'];

/** Status derived from quantity */
export type CromoStatus = 'missing' | 'have' | 'repeated';

/**
 * A catalog cromo joined with the user's inventory state.
 * All view nullable fields are narrowed to non-null here (catalog items are active).
 */
export interface AlbumCromo {
  id: string;
  n: number;
  number: number;
  player_name: string;
  position: string | null;
  jersey: number | null;
  rarity: string;
  rarity_id: RarityKey;
  rarity_label: string;
  rarity_chip: string;
  rarity_text: string;
  rarity_dot: string;
  rarity_sort_order: number;
  country: string;
  country_code: string;
  country_name: string;
  flag_emoji: string;
  accent: string;
  stripe: string;
  stripe2: string;
  catalog_version: number;
  is_active: boolean;
  created_at: string;
  /** Inventory quantity (0 if no row exists) */
  quantity: number;
  /** Derived from quantity */
  status: CromoStatus;
}

export interface CountryMeta {
  code: string;
  name: string;
  flag_emoji: string;
  accent: string;
  stripe: string;
  stripe2: string;
}

export interface AlbumSection {
  country: CountryMeta;
  /** All cromos for this country (post-filter applied at screen level) */
  cromos: AlbumCromo[];
  ownedCount: number;
  total: number;
}

export interface AlbumStats {
  owned: number;
  repeated: number;
  missing: number;
  pct: number;
}
