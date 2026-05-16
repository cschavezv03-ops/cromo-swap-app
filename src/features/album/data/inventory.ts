import { supabase } from '@/lib/supabase';
import {
  getDatabase,
  type InventoryLocal,
} from '@/features/storage/db';
import { enqueueInventoryDelta } from '@/features/storage/sync';

function computeStatus(owned: number, pasted: number): 'missing' | 'have' | 'repeated' {
  if (owned === 0) return 'missing';
  if (owned > pasted) return 'repeated';
  return 'have';
}

/** Read the current inventory row for a cromo (returns zeroed default if absent). */
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
 * Apply a delta to an inventory row LOCALLY and enqueue a sync to Supabase.
 * Optimistic: returns the new row after update.
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
  const pasted = Math.max(0, Math.min(owned, current.pasted_quantity + delta_pasted));
  const wanted = Math.max(0, current.wanted_quantity + delta_wanted);
  const status = computeStatus(owned, pasted);
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

  await enqueueInventoryDelta({
    cromo_id,
    delta_owned,
    delta_pasted,
    delta_wanted,
  });

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

/**
 * Set absolute owned quantity (used by long-press editor).
 */
export async function setOwnedQuantity(cromo_id: string, owned: number): Promise<InventoryLocal> {
  const current = await readInventory(cromo_id);
  return applyInventoryDelta({ cromo_id, delta_owned: owned - current.owned_quantity });
}

/**
 * Pull remote inventory rows and upsert into local. Used on cold start when
 * the user logs in for the first time on this device. Local rows with
 * dirty=1 are preserved (their deltas are still in sync_queue).
 */
export async function pullRemoteInventory(): Promise<number> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return 0;

  const { data, error } = await supabase
    .from('inventory_items')
    .select('cromo_id, owned_quantity, pasted_quantity, wanted_quantity, status, updated_at')
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
      if (localRow?.dirty === 1) continue; // pending push; skip overwrite

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
        [
          row.cromo_id,
          row.owned_quantity,
          row.pasted_quantity,
          row.wanted_quantity,
          row.status ?? computeStatus(row.owned_quantity, row.pasted_quantity),
          new Date(row.updated_at).getTime(),
        ],
      );
      count++;
    }
  });
  return count;
}

/**
 * Convenience: increment owned by 1 for a sequence of cromo ids (sobre entry).
 * Each id increments by 1, even if it appears multiple times in the array.
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
