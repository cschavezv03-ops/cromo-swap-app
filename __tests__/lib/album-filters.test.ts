/**
 * TDD tests for album-filters.ts
 * Spec: R4-6-1..R4-6-4
 *
 * Tests the pure applyFilters helper and the useReducer reducer transitions.
 * No React tree needed for applyFilters.
 */

import type { AlbumCromo } from '../../src/lib/album-types';
import { applyFilters, _reducer } from '../../src/lib/album-filters';

// ── fixtures ──────────────────────────────────────────────────────────────────
const makeCromo = (overrides: Partial<AlbumCromo>): AlbumCromo => ({
  id: 'uuid-1',
  number: 1,
  n: 1,
  player_name: 'Player One',
  position: 'DEF',
  jersey: 1,
  rarity: 'comun',
  rarity_id: 'comun',
  rarity_label: 'Común',
  rarity_chip: '#E8E5DE',
  rarity_text: '#3D3A33',
  rarity_dot: '#8B8678',
  rarity_sort_order: 1,
  country: 'ARG',
  country_code: 'ARG',
  country_name: 'Argentina',
  flag_emoji: '🇦🇷',
  accent: '#74ACDF',
  stripe: '#74ACDF',
  stripe2: '#FFFFFF',
  catalog_version: 1,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  quantity: 0,
  status: 'missing',
  ...overrides,
});

const fixtures: AlbumCromo[] = [
  makeCromo({ id: '1', country_code: 'ARG', status: 'missing', quantity: 0 }),
  makeCromo({ id: '2', country_code: 'ARG', status: 'have', quantity: 1 }),
  makeCromo({ id: '3', country_code: 'ARG', status: 'repeated', quantity: 3 }),
  makeCromo({ id: '4', country_code: 'BRA', status: 'missing', quantity: 0 }),
  makeCromo({ id: '5', country_code: 'BRA', status: 'have', quantity: 1 }),
  makeCromo({ id: '6', country_code: 'MEX', status: 'repeated', quantity: 2 }),
];

// ── applyFilters ──────────────────────────────────────────────────────────────
describe('applyFilters', () => {
  it('returns all rows when status=all and country=null', () => {
    const result = applyFilters(fixtures, 'all', null);
    expect(result).toHaveLength(6);
    expect(result).toEqual(fixtures);
  });

  it('filters to status=missing', () => {
    const result = applyFilters(fixtures, 'missing', null);
    expect(result).toHaveLength(2);
    result.forEach((c) => expect(c.status).toBe('missing'));
  });

  it('filters to status=have', () => {
    const result = applyFilters(fixtures, 'have', null);
    expect(result).toHaveLength(2);
    result.forEach((c) => expect(c.status).toBe('have'));
  });

  it('filters to status=repeated', () => {
    const result = applyFilters(fixtures, 'repeated', null);
    expect(result).toHaveLength(2);
    result.forEach((c) => expect(c.status).toBe('repeated'));
  });

  it('filters to country=ARG with status=all', () => {
    const result = applyFilters(fixtures, 'all', 'ARG');
    expect(result).toHaveLength(3);
    result.forEach((c) => expect(c.country_code).toBe('ARG'));
  });

  it('returns empty array when no BRA cromo is repeated', () => {
    const result = applyFilters(fixtures, 'repeated', 'BRA');
    expect(result).toHaveLength(0);
  });

  it('does not mutate the input array', () => {
    const original = [...fixtures];
    applyFilters(fixtures, 'missing', 'ARG');
    expect(fixtures).toEqual(original);
  });
});

// ── reducer transitions ───────────────────────────────────────────────────────
describe('filterReducer (_reducer)', () => {
  it('setStatus → setCountry → reset ends in initial state', () => {
    const initial = { status: 'all' as const, country: null };
    let state = _reducer(initial, { type: 'setStatus', status: 'missing' });
    state = _reducer(state, { type: 'setCountry', country: 'ARG' });
    state = _reducer(state, { type: 'reset' });
    expect(state).toEqual(initial);
  });

  it('setStatus updates status only', () => {
    const state = _reducer({ status: 'all', country: 'BRA' }, { type: 'setStatus', status: 'have' });
    expect(state).toEqual({ status: 'have', country: 'BRA' });
  });

  it('setCountry updates country only', () => {
    const state = _reducer({ status: 'repeated', country: null }, { type: 'setCountry', country: 'ARG' });
    expect(state).toEqual({ status: 'repeated', country: 'ARG' });
  });
});
