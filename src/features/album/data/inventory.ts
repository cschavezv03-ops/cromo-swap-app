import { supabase } from '@/lib/supabase';
import {
  getDatabase,
  type InventoryLocal,
} from '@/features/storage/db';
import { flushDirtyInventory } from '@/features/storage/sync';

/**
 * Etiqueta visible para el usuario.
 *   owned=0   → missing  (lo necesitas)
 *   owned=1   → have     (lo tienes, sin repetidos)
 *   owned>=2  → repeated (tienes duplicados)
 *
 * Coincide con la columna generada `inventory_items.status` en Supabase
 * (migración 0035) para que el cliente y el servidor reporten lo mismo.
 */
function computeStatus(owned: number): 'missing' | 'have' | 'repeated' {
  if (owned <= 0) return 'missing';
  if (owned === 1) return 'have';
  return 'repeated';
}

/** Lee la fila de inventario local; devuelve un default en cero si no existe. */
export async function readInventory(cromoId: string): Promise<InventoryLocal> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<InventoryLocal>(
    `SELECT * FROM inventory_local WHERE cromo_id = ?`,
    [cromoId],
  );
  if (row) return row;
  return {
    cromo_id: cromoId,
    owned_quantity: 0,
    pasted_quantity: 0,
    wanted_quantity: 0,
    status: 'missing',
    updated_at: Date.now(),
    dirty: 0,
  };
}

export async function readAllInventory(): Promise<InventoryLocal[]> {
  const db = await getDatabase();
  return db.getAllAsync<InventoryLocal>(`SELECT * FROM inventory_local`);
}

/**
 * Aplica un delta al inventario local Y dispara sync en segundo plano.
 * Optimista: retorna la fila actualizada de inmediato.
 */
export async function applyInventoryDelta(args: {
  cromo_id: string;
  delta_owned?: number;
  delta_pasted?: number;
  delta_wanted?: number;
}): Promise<InventoryLocal> {
  const { cromo_id, delta_owned = 0, delta_pasted = 0, delta_wanted = 0 } = args;
  const db = await getDatabase();
  const current = await readInventory(cromo_id);
  const owned = Math.max(0, current.owned_quantity + delta_owned);
  // El servidor exige pasted <= owned (CHECK constraint).
  const pasted = Math.max(0, Math.min(owned, current.pasted_quantity + delta_pasted));
  const wanted = Math.max(0, current.wanted_quantity + delta_wanted);
  const status = computeStatus(owned);
  const updatedAt = Date.now();

  await db.runAsync(
    `INSERT INTO inventory_local (cromo_id, owned_quantity, pasted_quantity, wanted_quantity, status, updated_at, dirty)
     VALUES (?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(cromo_id) DO UPDATE SET
       owned_quantity = excluded.owned_quantity,
       pasted_quantity = excluded.pasted_quantity,
       wanted_quantity = excluded.wanted_quantity,
       status = excluded.status,
       updated_at = excluded.updated_at,
       dirty = 1`,
    [cromo_id, owned, pasted, wanted, status, updatedAt],
  );

  // Dispara el sync sin bloquear la UI. flushDirtyInventory dedupea por sí solo.
  void flushDirtyInventory();

  return {
    cromo_id,
    owned_quantity: owned,
    pasted_quantity: pasted,
    wanted_quantity: wanted,
    status,
    updated_at: updatedAt,
    dirty: 1,
  };
}

/** Setea la cantidad de owned absoluta (usado por el editor del long-press). */
export async function setOwnedQuantity(cromo_id: string, owned: number): Promise<InventoryLocal> {
  const current = await readInventory(cromo_id);
  return applyInventoryDelta({ cromo_id, delta_owned: owned - current.owned_quantity });
}

/**
 * Trae las filas remotas de inventario del usuario y las upsertea en local.
 * Preserva filas dirty=1 (todavía no sincronizadas).
 */
export async function pullRemoteInventory(): Promise<number> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return 0;

  const { data, error } = await supabase
    .from('inventory_items')
    .select('cromo_id, owned_quantity, pasted_quantity, wanted_quantity, updated_at')
    .eq('user_id', userId);
  if (error) throw error;

  const db = await getDatabase();
  let count = 0;
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const row of data ?? []) {
      const localRow = await tx.getFirstAsync<{ dirty: number }>(
        `SELECT dirty FROM inventory_local WHERE cromo_id = ?`,
        [row.cromo_id],
      );
      if (localRow?.dirty === 1) continue; // pendiente de push; no piso

      const owned = row.owned_quantity;
      const pasted = row.pasted_quantity;
      const wanted = row.wanted_quantity;
      await tx.runAsync(
        `INSERT INTO inventory_local (cromo_id, owned_quantity, pasted_quantity, wanted_quantity, status, updated_at, dirty)
         VALUES (?, ?, ?, ?, ?, ?, 0)
         ON CONFLICT(cromo_id) DO UPDATE SET
           owned_quantity = excluded.owned_quantity,
           pasted_quantity = excluded.pasted_quantity,
           wanted_quantity = excluded.wanted_quantity,
           status = excluded.status,
           updated_at = excluded.updated_at,
           dirty = 0`,
        [row.cromo_id, owned, pasted, wanted, computeStatus(owned), new Date(row.updated_at).getTime()],
      );
      count++;
    }
  });
  return count;
}

/**
 * Suma N copias para cada cromo (entrada por sobres).
 */
export async function bulkAddByPrintedCodes(
  pairs: Array<{ cromo_id: string; count: number }>,
): Promise<number> {
  let total = 0;
  for (const { cromo_id, count } of pairs) {
    if (count <= 0) continue;
    await applyInventoryDelta({ cromo_id, delta_owned: count });
    total += count;
  }
  return total;
}
