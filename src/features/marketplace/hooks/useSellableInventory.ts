import { useQuery } from '@tanstack/react-query';

import { loadAllCromos } from '@/features/album/data/catalog';
import { readAllInventory } from '@/features/album/data/inventory';
import type { CatalogCromoLocal } from '@/features/storage/db';

/**
 * Un cromo listable: catálogo + cantidad disponible (owned).
 */
export type SellableCromo = CatalogCromoLocal & {
  owned: number;
  countryName?: string | null;
};

const KEY = ['marketplace', 'sellable'] as const;

/**
 * Inventario filtrado a cromos que el usuario puede listar a la venta.
 *
 * Regla: `owned >= 2` para que no venda su único ejemplar. Si en una
 * futura iteración se permite vender el único, ajustar el umbral acá.
 */
export function useSellableInventory() {
  return useQuery({
    queryKey: KEY,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<SellableCromo[]> => {
      const [cromos, inventory] = await Promise.all([loadAllCromos(), readAllInventory()]);
      const invByCromo = new Map(inventory.map((row) => [row.cromo_id, row]));
      const sellable: SellableCromo[] = [];
      for (const c of cromos) {
        const owned = invByCromo.get(c.id)?.owned_quantity ?? 0;
        if (owned < 2) continue;
        sellable.push({ ...c, owned });
      }
      sellable.sort((a, b) => {
        // primero los más repetidos
        if (b.owned !== a.owned) return b.owned - a.owned;
        if (a.section_code !== b.section_code) return a.section_code.localeCompare(b.section_code);
        return a.section_number - b.section_number;
      });
      return sellable;
    },
  });
}
