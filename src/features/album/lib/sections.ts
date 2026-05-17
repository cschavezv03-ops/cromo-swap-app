import type { CountryMeta } from './types';

/**
 * Metadata para las 4 secciones NO-país del álbum Panini.
 * Reusamos el shape de CountryMeta para que la UI las trate igual que un país.
 */
export const SPECIAL_SECTIONS: Record<string, CountryMeta> = {
  FWC: {
    code: 'FWC',
    name: 'Introducción',
    flag_emoji: '⚽️',
    stripe: '#1F1B14',
    accent: '#FFD46B',
  },
  MUSEUM: {
    code: 'MUSEUM',
    name: 'FIFA Museum',
    flag_emoji: '🏆',
    stripe: '#B8862C',
    accent: '#1F1B14',
  },
  COCA: {
    code: 'COCA',
    name: 'Coca-Cola Ecuador',
    flag_emoji: '🥤',
    stripe: '#D52B1E',
    accent: '#FFFFFF',
  },
  EXTRA: {
    code: 'EXTRA',
    name: 'Extra Stickers',
    flag_emoji: '✨',
    stripe: '#4F46E5',
    accent: '#FFFFFF',
  },
};

/**
 * Subtítulo descriptivo bajo el header de cada sección especial.
 */
export const SPECIAL_SECTION_HINTS: Record<string, string> = {
  FWC: 'Apertura del álbum oficial',
  MUSEUM: 'Leyendas históricas del Mundial',
  COCA: 'Exclusivos de Coca-Cola en Ecuador',
  EXTRA: 'Extra Stickers · 1 cada 100 sobres',
};

export function isSpecialSection(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(SPECIAL_SECTIONS, code);
}

/**
 * Orden canónico del álbum Panini Mundial 2026 (Ecuador edition):
 *
 *   1. FWC (intro)
 *   2. 48 selecciones nacionales — ordenadas por (group_code A→L, nombre)
 *   3. MUSEUM (FIFA Museum)
 *   4. COCA (Coca-Cola Ecuador)
 *   5. EXTRA (Extra Stickers internacionales)
 *
 * Devuelve un sort_key compuesto: [bucket, group_index, name]. La UI llama
 * con un comparador estándar sobre este valor.
 */
export function sectionSortKey(args: {
  code: string;
  group_code: string | null;
  name: string;
}): [number, string, string] {
  const { code, group_code, name } = args;
  if (code === 'FWC') return [0, '', ''];
  if (code === 'MUSEUM') return [2, '', ''];
  if (code === 'COCA') return [3, '', ''];
  if (code === 'EXTRA') return [4, '', ''];
  // Países: bucket 1, sub-orden por grupo (A→L → "AAA"-"LLL") y nombre.
  return [1, group_code ?? 'ZZZ', name];
}

export function compareSortKey(
  a: [number, string, string],
  b: [number, string, string],
): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1].localeCompare(b[1]);
  return a[2].localeCompare(b[2]);
}
