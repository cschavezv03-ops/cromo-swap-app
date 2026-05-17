import type { AlbumCromo } from './types';
import type { CatalogCromoLocal } from '@/features/storage/db';

/**
 * Normaliza un string: minúsculas, sin diacríticos, trim.
 * "Lionel Messi" → "lionel messi"
 * "Brasil" → "brasil"
 * "Müller" → "muller"
 */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Construye el "haystack" de un cromo: todos los campos buscables
 * concatenados y normalizados.
 *
 * Incluye:
 *  - Nombre jugador y display name
 *  - Código impreso (ARG 1)
 *  - Country code y section code
 *  - Section number y jersey (para búsqueda numérica)
 *  - Position
 *  - Country name (si está disponible)
 */
function buildHaystack(
  cromo: { player_name: string | null; display_name: string; printed_code: string; country_code: string | null; section_code: string; section_number: number; jersey: number | null; position: string | null },
  countryName?: string,
): string {
  const parts: string[] = [
    cromo.player_name ?? '',
    cromo.display_name,
    cromo.printed_code,
    cromo.country_code ?? '',
    cromo.section_code,
    cromo.section_number.toString(),
    cromo.jersey != null ? cromo.jersey.toString() : '',
    cromo.position ?? '',
    countryName ?? '',
  ];
  return normalize(parts.join(' '));
}

/**
 * Devuelve true si el cromo coincide con TODOS los tokens del query.
 * Cada token debe aparecer en algún campo del haystack.
 *
 * Ejemplos:
 *  - "messi"        → matchea cualquier cromo con MESSI en player_name
 *  - "lionel messi" → matchea cromos con LIONEL Y MESSI
 *  - "argentina 10" → matchea cromos de ARG con jersey 10 o printed_code 10
 *  - "ARG 1"        → matchea ARG 1
 *  - "esp"          → matchea España + Especial (todo lo que empiece con "esp")
 */
export function matchesQuery(
  cromo: AlbumCromo,
  query: string,
  countryName?: string,
): boolean {
  const q = normalize(query);
  if (!q) return true;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = buildHaystack(cromo, countryName);
  return tokens.every((t) => hay.includes(t));
}

/**
 * Versión para el catálogo crudo (CatalogCromoLocal) — útil en SobreSheet
 * donde no estamos pasando por useAlbumData.
 */
export function catalogMatchesQuery(
  cromo: CatalogCromoLocal,
  query: string,
  countryName?: string,
): boolean {
  const q = normalize(query);
  if (!q) return true;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = buildHaystack(cromo, countryName);
  return tokens.every((t) => hay.includes(t));
}
