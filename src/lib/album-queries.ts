/**
 * TanStack Query hooks + pure helpers for the album screen.
 * Spec: R4-4-1..R4-4-6
 *
 * Two parallel queries: catalog (staleTime: Infinity) + inventory (staleTime: 30s).
 * Joined in JS — no extra DB views or RPCs needed for Phase 4.
 */
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAlbumCatalog, getMyInventory } from './inventory';
import type { AlbumCatalogRow, InventoryRow } from './inventory';
import type { AlbumCromo, AlbumSection, AlbumStats, CountryMeta, CromoStatus } from './album-types';
import type { RarityKey } from '@/theme';
import { useSession } from './session-context';

// ── Query keys ────────────────────────────────────────────────────────────────
export const CATALOG_KEY = ['album-catalog'] as const;
export const inventoryKey = (uid: string | null) => ['inventory', uid] as const;

// ── Pure helpers (exported for unit testing) ──────────────────────────────────

/**
 * Derive status from quantity (mirrors the DB GENERATED column logic).
 */
function deriveStatus(quantity: number): CromoStatus {
  if (quantity === 0) return 'missing';
  if (quantity === 1) return 'have';
  return 'repeated';
}

/**
 * Build 16 AlbumSection objects from the flat catalog + inventory rows.
 * Sections sorted alphabetically by country code; cromos sorted by n.
 */
export function buildSections(
  catalog: AlbumCatalogRow[] | undefined,
  inventory: InventoryRow[] | undefined
): AlbumSection[] {
  if (!catalog || catalog.length === 0) return [];

  const inv = inventory ?? [];

  // Build a lookup: cromo_id → inventory row
  const invMap = new Map<string, InventoryRow>();
  inv.forEach((row) => invMap.set(row.cromo_id, row));

  // Group catalog rows by country_code
  const byCountry = new Map<string, AlbumCatalogRow[]>();
  catalog.forEach((row) => {
    const code = row.country_code ?? '';
    if (!byCountry.has(code)) byCountry.set(code, []);
    byCountry.get(code)!.push(row);
  });

  // Build sections
  const sections: AlbumSection[] = [];
  byCountry.forEach((rows, code) => {
    // Sort cromos by n
    const sorted = [...rows].sort((a, b) => (a.n ?? 0) - (b.n ?? 0));

    const country: CountryMeta = {
      code,
      name: sorted[0]?.country_name ?? code,
      flag_emoji: sorted[0]?.flag_emoji ?? '',
      accent: sorted[0]?.accent ?? '#000',
      stripe: sorted[0]?.stripe ?? '#000',
      stripe2: sorted[0]?.stripe2 ?? '#FFF',
    };

    const cromos: AlbumCromo[] = sorted.map((row) => {
      const invRow = invMap.get(row.id ?? '');
      const quantity = invRow?.quantity ?? 0;
      const status = deriveStatus(quantity);

      return {
        id: row.id ?? '',
        n: row.n ?? 0,
        number: row.n ?? 0,
        player_name: row.player_name ?? '',
        position: row.position ?? null,
        jersey: row.jersey ?? null,
        rarity: row.rarity_id ?? 'comun',
        rarity_id: (row.rarity_id ?? 'comun') as RarityKey,
        rarity_label: row.rarity_label ?? '',
        rarity_chip: row.rarity_chip ?? '',
        rarity_text: row.rarity_text ?? '',
        rarity_dot: row.rarity_dot ?? '',
        rarity_sort_order: row.rarity_sort_order ?? 0,
        country: row.country_code ?? '',
        country_code: row.country_code ?? '',
        country_name: row.country_name ?? '',
        flag_emoji: row.flag_emoji ?? '',
        accent: row.accent ?? '#000',
        stripe: row.stripe ?? '#000',
        stripe2: row.stripe2 ?? '#FFF',
        catalog_version: row.catalog_version ?? 1,
        is_active: row.is_active ?? true,
        created_at: row.created_at ?? '',
        quantity,
        status,
      };
    });

    const ownedCount = cromos.filter((c) => c.status !== 'missing').length;

    sections.push({ country, cromos, ownedCount, total: cromos.length });
  });

  // Sort sections alphabetically by country code
  sections.sort((a, b) => a.country.code.localeCompare(b.country.code));

  return sections;
}

/**
 * Compute summary stats from all sections.
 */
export function buildStats(sections: AlbumSection[]): AlbumStats {
  let owned = 0;
  let repeated = 0;
  let total = 0;

  sections.forEach((s) => {
    s.cromos.forEach((c) => {
      total++;
      if (c.status === 'have' || c.status === 'repeated') owned++;
      if (c.status === 'repeated') repeated++;
    });
  });

  const missing = total - owned;
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;

  return { owned, repeated, missing, pct };
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export interface UseAlbumReturn {
  sections: AlbumSection[];
  stats: AlbumStats;
  isLoading: boolean;
  isRefetching: boolean;
  refetch: () => Promise<void>;
}

/**
 * Primary album hook: fetches catalog + user inventory in parallel,
 * joins them into sections + stats.
 */
export function useAlbum(): UseAlbumReturn {
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  const catalogQ = useQuery({
    queryKey: CATALOG_KEY,
    queryFn: getAlbumCatalog,
    staleTime: Infinity, // catalog is immutable within a session
  });

  const inventoryQ = useQuery({
    queryKey: inventoryKey(userId),
    queryFn: getMyInventory,
    staleTime: 30_000,
    enabled: true, // always fetch; returns [] if no user (RLS-gated)
  });

  const sections = useMemo(
    () => buildSections(catalogQ.data, inventoryQ.data),
    [catalogQ.data, inventoryQ.data]
  );

  const stats = useMemo(() => buildStats(sections), [sections]);

  const refetch = async () => {
    await Promise.all([catalogQ.refetch(), inventoryQ.refetch()]);
  };

  return {
    sections,
    stats,
    isLoading: catalogQ.isLoading || inventoryQ.isLoading,
    isRefetching: catalogQ.isRefetching || inventoryQ.isRefetching,
    refetch,
  };
}

/**
 * Mutation hook for setting cromo quantity with optimistic updates.
 * onMutate: cancel + snapshot + optimistic write.
 * onError: rollback.
 * onSettled: invalidate to re-fetch canonical truth.
 */
export function useSetQuantity() {
  const qc = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  return useMutation({
    mutationFn: async ({ cromoId, quantity }: { cromoId: string; quantity: number }) => {
      const { setQuantity } = await import('./inventory');
      const result = await setQuantity(cromoId, quantity);
      if (result.error) throw result.error;
    },

    onMutate: async ({ cromoId, quantity }) => {
      const key = inventoryKey(userId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<InventoryRow[]>(key) ?? [];

      const optimisticStatus = deriveStatus(quantity);
      const idx = prev.findIndex((r) => r.cromo_id === cromoId);
      const next: InventoryRow[] =
        idx >= 0
          ? Object.assign([], prev, {
              [idx]: { ...prev[idx], quantity, status: optimisticStatus },
            })
          : [
              ...prev,
              {
                id: `optimistic-${cromoId}`,
                user_id: userId ?? '',
                cromo_id: cromoId,
                quantity,
                status: optimisticStatus,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ];

      qc.setQueryData(key, next);
      return { prev };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx) {
        qc.setQueryData(inventoryKey(userId), ctx.prev);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: inventoryKey(userId) });
    },
  });
}
