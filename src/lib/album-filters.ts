/**
 * Album filter state (useReducer hook) + pure applyFilters helper.
 * Spec: R4-6-1..R4-6-4
 *
 * State is component-local — no Zustand, not persisted across restarts (Phase 4).
 */
import { useReducer } from 'react';
import type { AlbumCromo, CromoStatus } from './album-types';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface FilterState {
  status: 'all' | CromoStatus;
  country: string | null;
}

type FilterAction =
  | { type: 'setStatus'; status: FilterState['status'] }
  | { type: 'setCountry'; country: string | null }
  | { type: 'reset' };

// ── Reducer (exported for direct testing without React) ───────────────────────
const initial: FilterState = { status: 'all', country: null };

export function _reducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'setStatus':
      return { ...state, status: action.status };
    case 'setCountry':
      return { ...state, country: action.country };
    case 'reset':
      return initial;
  }
}

// ── Pure filter helper ────────────────────────────────────────────────────────
/**
 * Filter a flat array of AlbumCromo by status and/or country.
 * Pure function — never mutates input.
 */
export function applyFilters(
  cromos: AlbumCromo[],
  status: FilterState['status'],
  country: string | null
): AlbumCromo[] {
  return cromos.filter(
    (c) =>
      (status === 'all' || c.status === status) &&
      (country === null || c.country_code === country)
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export interface AlbumFiltersHook {
  status: FilterState['status'];
  country: string | null;
  setStatus: (s: FilterState['status']) => void;
  setCountry: (c: string | null) => void;
  reset: () => void;
}

export function useAlbumFilters(): AlbumFiltersHook {
  const [state, dispatch] = useReducer(_reducer, initial);

  return {
    status: state.status,
    country: state.country,
    setStatus: (s) => dispatch({ type: 'setStatus', status: s }),
    setCountry: (c) => dispatch({ type: 'setCountry', country: c }),
    reset: () => dispatch({ type: 'reset' }),
  };
}
