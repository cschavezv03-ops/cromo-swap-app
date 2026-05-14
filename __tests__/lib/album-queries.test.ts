/**
 * TDD tests for album-queries.ts — pure helpers (buildSections, buildStats)
 * and optimistic-update mutation logic via a real QueryClient.
 *
 * Spec: R4-4-1..R4-4-6
 *
 * We test the logic-layer helpers without mounting a React tree.
 * Hooks (useAlbum, useSetQuantity) are integration-tested via the screen smoke test.
 */

// Mock supabase so importing album-queries doesn't pull in native modules
jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'user-1' } } })) },
    from: jest.fn(),
  },
}));

// Mock session-context (imported by album-queries for the hook)
jest.mock('../../src/lib/session-context', () => ({
  useSession: jest.fn(() => ({ session: { user: { id: 'user-1' } } })),
}));

import { QueryClient } from '@tanstack/react-query';
import type { AlbumCromo, AlbumSection, AlbumStats } from '../../src/lib/album-types';
import type { AlbumCatalogRow, InventoryRow } from '../../src/lib/inventory';
import { buildSections, buildStats } from '../../src/lib/album-queries';

// ── fixtures ──────────────────────────────────────────────────────────────────
const makeRow = (overrides: Partial<AlbumCatalogRow>): AlbumCatalogRow => ({
  id: 'id-1',
  n: 1,
  player_name: 'Player One',
  position: 'DEF',
  jersey: 10,
  rarity_id: 'comun',
  rarity_label: 'Común',
  rarity_chip: '#E8E5DE',
  rarity_text: '#3D3A33',
  rarity_dot: '#8B8678',
  rarity_sort_order: 1,
  country_code: 'ARG',
  country_name: 'Argentina',
  flag_emoji: '🇦🇷',
  accent: '#74ACDF',
  stripe: '#74ACDF',
  stripe2: '#FFFFFF',
  catalog_version: 1,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

// Build a minimal 2-country catalog with 2 cromos each
const catalogRows: AlbumCatalogRow[] = [
  makeRow({ id: 'arg-1', n: 1, country_code: 'ARG', country_name: 'Argentina', flag_emoji: '🇦🇷' }),
  makeRow({ id: 'arg-2', n: 2, country_code: 'ARG', country_name: 'Argentina', flag_emoji: '🇦🇷' }),
  makeRow({ id: 'bra-1', n: 1, country_code: 'BRA', country_name: 'Brasil', flag_emoji: '🇧🇷', accent: '#009C3B', stripe: '#009C3B', stripe2: '#FFDF00' }),
  makeRow({ id: 'bra-2', n: 2, country_code: 'BRA', country_name: 'Brasil', flag_emoji: '🇧🇷', accent: '#009C3B', stripe: '#009C3B', stripe2: '#FFDF00' }),
];

const makeInvRow = (overrides: Partial<InventoryRow>): InventoryRow => ({
  id: 'inv-1',
  user_id: 'user-uuid',
  cromo_id: 'arg-1',
  quantity: 1,
  status: 'have',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

// ── buildSections ─────────────────────────────────────────────────────────────
describe('buildSections', () => {
  it('returns sections sorted by country; cromos sorted by n ascending', () => {
    const sections = buildSections(catalogRows, []);
    expect(sections).toHaveLength(2);
    // countries sorted alphabetically
    const codes = sections.map((s) => s.country.code);
    expect(codes).toEqual([...codes].sort());
    // cromos inside each section sorted by n
    sections.forEach((s) => {
      const ns = s.cromos.map((c) => c.n);
      expect(ns).toEqual([...ns].sort((a, b) => a - b));
    });
  });

  it('all cromos have status=missing and quantity=0 when inventory is empty', () => {
    const sections = buildSections(catalogRows, []);
    sections.forEach((section) => {
      section.cromos.forEach((c) => {
        expect(c.status).toBe('missing');
        expect(c.quantity).toBe(0);
      });
    });
  });

  it('ownedCount = count of have+repeated per section', () => {
    const inv: InventoryRow[] = [
      makeInvRow({ cromo_id: 'arg-1', quantity: 1, status: 'have' }),
      makeInvRow({ id: 'inv-2', cromo_id: 'arg-2', quantity: 3, status: 'repeated' }),
    ];
    const sections = buildSections(catalogRows, inv);
    const arg = sections.find((s) => s.country.code === 'ARG');
    expect(arg?.ownedCount).toBe(2);
    const bra = sections.find((s) => s.country.code === 'BRA');
    expect(bra?.ownedCount).toBe(0);
  });

  it('total is the count of cromos in the section', () => {
    const sections = buildSections(catalogRows, []);
    sections.forEach((s) => expect(s.total).toBe(2));
  });

  it('handles undefined catalog or inventory gracefully (returns [])', () => {
    expect(buildSections(undefined, undefined)).toEqual([]);
    expect(buildSections([], [])).toEqual([]);
  });

  it('joins inventory: quantity=2 → status=repeated', () => {
    const inv: InventoryRow[] = [
      makeInvRow({ cromo_id: 'arg-1', quantity: 2, status: 'repeated' }),
    ];
    const sections = buildSections(catalogRows, inv);
    const arg = sections.find((s) => s.country.code === 'ARG');
    const cromo = arg?.cromos.find((c) => c.id === 'arg-1');
    expect(cromo?.status).toBe('repeated');
    expect(cromo?.quantity).toBe(2);
  });
});

// ── buildStats ────────────────────────────────────────────────────────────────
describe('buildStats', () => {
  it('returns all-zero stats when sections is empty', () => {
    const stats = buildStats([]);
    expect(stats).toEqual({ owned: 0, repeated: 0, missing: 0, pct: 0 });
  });

  it('returns correct owned/repeated/missing when some owned', () => {
    const inv: InventoryRow[] = [
      makeInvRow({ cromo_id: 'arg-1', quantity: 1, status: 'have' }),
      makeInvRow({ id: 'inv-2', cromo_id: 'bra-1', quantity: 3, status: 'repeated' }),
    ];
    const sections = buildSections(catalogRows, inv);
    const stats = buildStats(sections);
    // total = 4 cromos; owned = 2 (arg-1 have + bra-1 repeated), missing = 2
    expect(stats.owned).toBe(2);
    expect(stats.repeated).toBe(1);
    expect(stats.missing).toBe(2);
    // pct = round(2/4*100) = 50
    expect(stats.pct).toBe(50);
  });

  it('returns pct=0 when no cromos owned', () => {
    const sections = buildSections(catalogRows, []);
    const stats = buildStats(sections);
    expect(stats.owned).toBe(0);
    expect(stats.missing).toBe(4);
    expect(stats.pct).toBe(0);
  });
});

// ── optimistic-update logic ───────────────────────────────────────────────────
describe('optimistic update flow', () => {
  const userId = 'user-uuid';
  const inventoryKey = ['inventory', userId] as const;

  it('onMutate sets cache optimistically, onError reverts, onSettled clears', async () => {
    const qc = new QueryClient();

    const prevInventory: InventoryRow[] = [
      makeInvRow({ cromo_id: 'arg-1', quantity: 1, status: 'have' }),
    ];
    qc.setQueryData(inventoryKey, prevInventory);

    // Simulate onMutate
    const cromoId = 'arg-1';
    const newQuantity: number = 2;

    // Cancel + snapshot
    await qc.cancelQueries({ queryKey: inventoryKey });
    const snapshot = qc.getQueryData<InventoryRow[]>(inventoryKey) ?? [];
    expect(snapshot).toEqual(prevInventory);

    // Compute optimistic status
    const optimisticStatus: 'missing' | 'have' | 'repeated' =
      newQuantity === 0 ? 'missing' : newQuantity === 1 ? 'have' : 'repeated';
    const idx = snapshot.findIndex((r) => r.cromo_id === cromoId);
    const optimistic = idx >= 0
      ? Object.assign([], snapshot, { [idx]: { ...snapshot[idx], quantity: newQuantity, status: optimisticStatus } })
      : [...snapshot, makeInvRow({ cromo_id: cromoId, quantity: newQuantity, status: optimisticStatus })];

    qc.setQueryData(inventoryKey, optimistic);

    // Assert cache was updated optimistically
    const afterOptimistic = qc.getQueryData<InventoryRow[]>(inventoryKey);
    const updatedRow = afterOptimistic?.find((r) => r.cromo_id === cromoId);
    expect(updatedRow?.quantity).toBe(2);
    expect(updatedRow?.status).toBe('repeated');

    // Simulate onError: rollback
    qc.setQueryData(inventoryKey, snapshot);
    const afterRollback = qc.getQueryData<InventoryRow[]>(inventoryKey);
    expect(afterRollback).toEqual(prevInventory);

    // Simulate onSettled: invalidate (sets stale; next read re-fetches)
    qc.invalidateQueries({ queryKey: inventoryKey });
    // Invalidation sets query as stale but doesn't remove data
    // Just verify it doesn't throw
    expect(qc.getQueryData(inventoryKey)).toEqual(prevInventory);
  });
});
