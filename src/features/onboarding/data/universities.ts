import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import type { Tables } from '@/shared/types/database';

export type University = Tables<'universities'>;

export const universityKeys = {
  all: ['universities'] as const,
};

export function useUniversities() {
  return useQuery({
    queryKey: universityKeys.all,
    staleTime: 1000 * 60 * 60 * 24,
    queryFn: async (): Promise<University[]> => {
      const { data, error } = await supabase
        .from('universities')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
