import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import type { Tables, Views } from '@/shared/types/database';

export type CromoCatalog = Views<'cromo_with_country_rarity'>;
export type InventoryItem = Tables<'inventory_items'>;

export const albumKeys = {
  catalog: ['album', 'catalog'] as const,
  inventory: (userId: string | undefined) => ['album', 'inventory', userId] as const,
};

export function useCatalog() {
  return useQuery({
    queryKey: albumKeys.catalog,
    staleTime: 1000 * 60 * 60 * 6,
    queryFn: async (): Promise<CromoCatalog[]> => {
      const { data, error } = await supabase
        .from('cromo_with_country_rarity')
        .select('*')
        .eq('is_active', true)
        .order('country_code', { ascending: true, nullsFirst: false })
        .order('section_number', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInventory(userId: string | undefined) {
  return useQuery({
    queryKey: albumKeys.inventory(userId),
    enabled: !!userId,
    queryFn: async (): Promise<InventoryItem[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return data ?? [];
    },
  });
}
