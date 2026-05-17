import { useQuery } from '@tanstack/react-query';

import { searchProfiles, type ProfileSearchResult } from '../data/search';

export type { ProfileSearchResult };

/**
 * Búsqueda de usuarios. Devuelve resultados solo cuando hay query >= 2
 * chars (o universidad set) para no spamear el RPC con cada keystroke.
 *
 * El componente debe pasar el `query` ya debouncado.
 */
export function useSearchProfiles(query: string, university: string | null = null) {
  const trimmed = query.trim();
  const enabled = trimmed.length >= 2 || Boolean(university);
  return useQuery({
    queryKey: ['profile-search', trimmed, university ?? 'any'],
    enabled,
    queryFn: () => searchProfiles(trimmed, university),
    staleTime: 1000 * 30,
  });
}
