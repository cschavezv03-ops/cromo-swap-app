import { useEffect, useState } from 'react';
import { create } from 'zustand';

import { kv, KvKey } from '@/features/storage/kv';

import type { FilterTab } from '../lib/types';

type FiltersState = {
  tab: FilterTab;
  selectedCountries: string[]; // ISO codes; empty = all
  hydrated: boolean;
  setTab: (tab: FilterTab) => void;
  toggleCountry: (code: string) => void;
  clearCountries: () => void;
  hydrate: () => void;
};

export const useFiltersStore = create<FiltersState>((set, get) => ({
  tab: 'all',
  selectedCountries: [],
  hydrated: false,
  setTab: (tab) => {
    set({ tab });
    kv.set(KvKey.album.lastFilter, tab);
  },
  toggleCountry: (code) => {
    const next = get().selectedCountries.includes(code)
      ? get().selectedCountries.filter((c) => c !== code)
      : [...get().selectedCountries, code];
    set({ selectedCountries: next });
    kv.set(KvKey.album.selectedCountries, JSON.stringify(next));
  },
  clearCountries: () => {
    set({ selectedCountries: [] });
    kv.set(KvKey.album.selectedCountries, '[]');
  },
  hydrate: () => {
    const t = kv.getString(KvKey.album.lastFilter);
    const raw = kv.getString(KvKey.album.selectedCountries);
    let countries: string[] = [];
    if (raw) {
      try {
        countries = JSON.parse(raw) as string[];
      } catch {
        countries = [];
      }
    }
    set({
      tab: (t as FilterTab) ?? 'all',
      selectedCountries: countries,
      hydrated: true,
    });
  },
}));

/** Hydrates from MMKV on first mount; safe to call from many places. */
export function useFiltersHydration() {
  const hydrated = useFiltersStore((s) => s.hydrated);
  const hydrate = useFiltersStore((s) => s.hydrate);
  const [done, setDone] = useState(hydrated);
  useEffect(() => {
    if (!hydrated) {
      hydrate();
      setDone(true);
    }
  }, [hydrate, hydrated]);
  return done;
}
