import { supabase } from '@/lib/supabase';
import {
  getDatabase,
  type InventoryLocal,
} from '@/features/storage/db';
import { scheduleFlush } from '@/features/storage/sync';

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

  // Sync con debounce — múltiples taps en rápida sucesión se agrupan
  // en una sola corrida después de 800ms de inactividad.
  scheduleFlush();

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
 *
 * Performance: usa bulk INSERT con multi-row VALUES en lugar de N runAsync
 * individuales. Con 500 cromos pasa de ~3s a ~80ms.
 */
const PULL_BATCH = 50;

export async function pullRemoteInventory(): Promise<number> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return 0;

  const { data, error } = await supabase
    .from('inventory_items')
    .select('cromo_id, owned_quantity, pasted_quantity, wanted_quantity, updated_at')
    .eq('user_id', userId);
  if (error) throw error;

  const remoteRows = data ?? [];
  if (remoteRows.length === 0) return 0;

  const db = await getDatabase();

  // 1) Identificar qué cromos están dirty localmente para NO pisarlos.
  const dirtyIds = new Set<string>();
  const dirtyRows = await db.getAllAsync<{ cromo_id: string }>(
    `SELECT cromo_id FROM inventory_local WHERE dirty = 1`,
  );
  for (const r of dirtyRows) dirtyIds.add(r.cromo_id);

  // 2) Filtrar los que sí podemos pisar y bulk-insert/upsert.
  const writable = remoteRows.filter((r) => !dirtyIds.has(r.cromo_id));
  if (writable.length === 0) return 0;

  const cols = `(cromo_id, owned_quantity, pasted_quantity, wanted_quantity, status, updated_at, dirty)`;
  const rowPlaceholder = '(?,?,?,?,?,?,0)';
  const onConflict = `ON CONFLICT(cromo_id) DO UPDATE SET
    owned_quantity = excluded.owned_quantity,
    pasted_quantity = excluded.pasted_quantity,
    wanted_quantity = excluded.wanted_quantity,
    status = excluded.status,
    updated_at = excluded.updated_at,
    dirty = 0`;

  await db.withExclusiveTransactionAsync(async (tx) => {
    for (let i = 0; i < writable.length; i += PULL_BATCH) {
      const slice = writable.slice(i, i + PULL_BATCH);
      const ph = slice.map(() => rowPlaceholder).join(',');
      const params: (string | number | null)[] = [];
      for (const r of slice) {
        params.push(
          r.cromo_id,
          r.owned_quantity,
          r.pasted_quantity,
          r.wanted_quantity,
          computeStatus(r.owned_quantity),
          new Date(r.updated_at).getTime(),
        );
      }
      await tx.runAsync(
        `INSERT INTO inventory_local ${cols} VALUES ${ph} ${onConflict}`,
        params,
      );
    }
  });

  return writable.length;
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
