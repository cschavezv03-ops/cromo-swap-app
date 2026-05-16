import type { CromoCatalog, InventoryItem } from '@/features/album/data/queries';

export type AlbumFilter = 'all' | 'missing' | 'repeated' | 'have';

export type AlbumItem = CromoCatalog & {
  ownedQuantity: number;
  pastedQuantity: number;
  isMissing: boolean;
  isRepeated: boolean;
  isOwned: boolean;
};

export type AlbumSection = {
  countryCode: string;
  countryName: string;
  flag: string;
  accent: string;
  total: number;
  owned: number;
  rows: AlbumItem[][];
};

export function mergeInventory(
  catalog: CromoCatalog[],
  inventory: InventoryItem[],
): AlbumItem[] {
  const invByCromo = new Map<string, InventoryItem>();
  for (const item of inventory) invByCromo.set(item.cromo_id, item);

  return catalog.map((c) => {
    const inv = c.id ? invByCromo.get(c.id) : undefined;
    const owned = inv?.owned_quantity ?? 0;
    const pasted = inv?.pasted_quantity ?? 0;
    return {
      ...c,
      ownedQuantity: owned,
      pastedQuantity: pasted,
      isMissing: owned === 0,
      isRepeated: owned > 1,
      isOwned: owned >= 1,
    };
  });
}

export function applyFilter(items: AlbumItem[], filter: AlbumFilter): AlbumItem[] {
  switch (filter) {
    case 'missing':
      return items.filter((i) => i.isMissing);
    case 'repeated':
      return items.filter((i) => i.isRepeated);
    case 'have':
      return items.filter((i) => i.isOwned);
    case 'all':
    default:
      return items;
  }
}

export function applyCountryFilter(items: AlbumItem[], country: string | null): AlbumItem[] {
  if (!country || country === 'ALL') return items;
  return items.filter((i) => i.country_code === country);
}

export function computeCounts(items: AlbumItem[]) {
  let total = items.length;
  let owned = 0;
  let missing = 0;
  let repeated = 0;
  for (const it of items) {
    if (it.isOwned) owned++;
    if (it.isMissing) missing++;
    if (it.isRepeated) repeated++;
  }
  return { total, owned, missing, repeated };
}

export function groupByCountry(items: AlbumItem[], columns: number): AlbumSection[] {
  const byCountry = new Map<string, AlbumItem[]>();
  for (const item of items) {
    if (!item.country_code) continue;
    const arr = byCountry.get(item.country_code) ?? [];
    arr.push(item);
    byCountry.set(item.country_code, arr);
  }

  const sections: AlbumSection[] = [];
  for (const [code, list] of byCountry) {
    const first = list[0]!;
    const owned = list.filter((i) => i.isOwned).length;
    const rows: AlbumItem[][] = [];
    for (let i = 0; i < list.length; i += columns) {
      rows.push(list.slice(i, i + columns));
    }
    sections.push({
      countryCode: code,
      countryName: first.country_name ?? code,
      flag: first.flag_emoji ?? '',
      accent: first.accent ?? '#15140F',
      total: list.length,
      owned,
      rows,
    });
  }
  return sections;
}

export function distinctCountries(items: AlbumItem[]) {
  const seen = new Map<string, { code: string; name: string; flag: string; accent: string }>();
  for (const it of items) {
    if (!it.country_code) continue;
    if (seen.has(it.country_code)) continue;
    seen.set(it.country_code, {
      code: it.country_code,
      name: it.country_name ?? it.country_code,
      flag: it.flag_emoji ?? '',
      accent: it.accent ?? '#15140F',
    });
  }
  return Array.from(seen.values());
}
