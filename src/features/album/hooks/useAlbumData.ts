import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { loadAllCountries, loadAllCromos } from '../data/catalog';
import { readAllInventory } from '../data/inventory';
import { matchesQuery } from '../lib/search';
import { compareSortKey, SPECIAL_SECTIONS, sectionSortKey } from '../lib/sections';
import { useFiltersStore } from './useFilters';
import type {
  AlbumCromo,
  AlbumData,
  AlbumStats,
  CountryMeta,
  CountrySectionData,
  FilterTab,
} from '../lib/types';

const QUERY_KEY = ['album', 'all'];

async function buildAlbumData(): Promise<AlbumData> {
  const [cromos, countries, inventory] = await Promise.all([
    loadAllCromos(),
    loadAllCountries(),
    readAllInventory(),
  ]);

  const invByCromo = new Map(inventory.map((row) => [row.cromo_id, row]));

  const stats: AlbumStats = { total: cromos.length, have: 0, missing: 0, repeated: 0 };

  const enriched: AlbumCromo[] = cromos.map((c) => {
    const inv = invByCromo.get(c.id);
    const owned = inv?.owned_quantity ?? 0;
    const pasted = inv?.pasted_quantity ?? 0;
    const wanted = inv?.wanted_quantity ?? 0;
    const status = inv?.status ?? 'missing';
    if (status === 'missing') stats.missing++;
    else if (status === 'repeated') stats.repeated++;
    else stats.have++;
    return {
      id: c.id,
      section_code: c.section_code,
      section_number: c.section_number,
      printed_code: c.printed_code,
      country_code: c.country_code,
      rarity_id: c.rarity_id,
      jersey: c.jersey,
      player_name: c.player_name,
      display_name: c.display_name,
      position: c.position,
      sticker_type: c.sticker_type,
      is_special: Boolean(c.is_special),
      page_number: c.page_number,
      group_code: c.group_code,
      owned,
      pasted,
      wanted,
      status,
      dirty: Boolean(inv?.dirty),
    };
  });

  // Grupamos por section_code (no por country_code) — eso preserva la
  // estructura del álbum Panini real: FWC, países, MUSEUM, COCA, EXTRA
  // son secciones distintas aunque algunos cromos COCA o EXTRA referencien
  // una country_code (ej. EXTRA 7 = Caicedo ECU, pero va en EXTRA, no en ECU).
  const countryByCode = new Map<string, CountryMeta>(
    countries.map((c) => [
      c.code,
      {
        code: c.code,
        name: c.name,
        stripe: c.stripe,
        accent: c.accent,
        flag_emoji: c.flag_emoji,
        group_code: (c as { group_code?: string | null }).group_code ?? null,
      } as CountryMeta,
    ]),
  );

  const sectionsMap = new Map<string, CountrySectionData>();
  for (const cromo of enriched) {
    const code = cromo.section_code;
    let section = sectionsMap.get(code);
    if (!section) {
      // Prioridad: 1) Especiales hardcoded (FWC/MUSEUM/COCA/EXTRA)
      //            2) Lookup en tabla countries
      //            3) Fallback genérico
      const meta: CountryMeta =
        SPECIAL_SECTIONS[code] ??
        countryByCode.get(code) ??
        {
          code,
          name: code,
          stripe: '#9CA3AF',
          accent: '#9CA3AF',
          flag_emoji: '🏳️',
        };
      section = { country: meta, cromos: [], haveCount: 0, totalCount: 0 };
      sectionsMap.set(code, section);
    }
    section.cromos.push(cromo);
    section.totalCount++;
    if (cromo.status !== 'missing') section.haveCount++;
  }

  // Ordenar cromos dentro de cada sección por section_number ASC
  // (igual que el álbum físico).
  for (const section of sectionsMap.values()) {
    section.cromos.sort((a, b) => a.section_number - b.section_number);
  }

  // Orden Panini canónico: FWC → países (por grupo A-L, nombre) → MUSEUM → COCA → EXTRA.
  const sections = Array.from(sectionsMap.values()).sort((a, b) => {
    const ka = sectionSortKey({
      code: a.country.code,
      group_code: (a.country as CountryMeta).group_code ?? null,
      name: a.country.name,
    });
    const kb = sectionSortKey({
      code: b.country.code,
      group_code: (b.country as CountryMeta).group_code ?? null,
      name: b.country.name,
    });
    return compareSortKey(ka, kb);
  });

  return { sections, stats };
}

export function useAlbumData() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: buildAlbumData,
    staleTime: 1000 * 60,
  });
}

/** Apply filter + country selection + search query on top of the query result. */
export function useFilteredAlbum(): AlbumData & {
  isLoading: boolean;
  isSearching: boolean;
} {
  const { data, isLoading } = useAlbumData();
  const tab = useFiltersStore((s) => s.tab);
  const selectedCountries = useFiltersStore((s) => s.selectedCountries);
  const search = useFiltersStore((s) => s.search);

  return useMemo(() => {
    if (!data) {
      return {
        sections: [],
        stats: { total: 0, have: 0, missing: 0, repeated: 0 },
        isLoading,
        isSearching: search.trim().length > 0,
      };
    }

    const wantCountries = selectedCountries.length === 0 ? null : new Set(selectedCountries);
    const hasSearch = search.trim().length > 0;

    const filteredSections: CountrySectionData[] = [];
    for (const section of data.sections) {
      if (wantCountries && !wantCountries.has(section.country.code)) continue;

      const cromos = section.cromos.filter((c) => {
        if (!matchesTab(c.status, tab)) return false;
        if (hasSearch && !matchesQuery(c, search, section.country.name)) return false;
        return true;
      });
      if (cromos.length === 0) continue;
      const haveCount = cromos.filter((c) => c.status !== 'missing').length;
      filteredSections.push({
        ...section,
        cromos,
        haveCount,
        totalCount: cromos.length,
      });
    }

    return {
      sections: filteredSections,
      stats: data.stats,
      isLoading,
      isSearching: hasSearch,
    };
  }, [data, tab, selectedCountries, search, isLoading]);
}

function matchesTab(status: AlbumCromo['status'], tab: FilterTab): boolean {
  switch (tab) {
    case 'all':
      return true;
    case 'missing':
      return status === 'missing';
    case 'repeated':
      return status === 'repeated';
    case 'have':
      return status !== 'missing';
  }
}

export const albumQueryKey = QUERY_KEY;
