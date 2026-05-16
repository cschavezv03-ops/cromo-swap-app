import NetInfo from '@react-native-community/netinfo';

import { supabase } from '@/lib/supabase';

import { getDatabase, type SyncQueueRow } from './db';
import { kv, KvKey } from './kv';

type InventoryDelta = {
  cromo_id: string;
  delta_owned: number;
  delta_pasted: number;
  delta_wanted: number;
};

let isRunning = false;
let listenerInstalled = false;

/**
 * Enqueue a local inventory delta to be pushed to Supabase when online.
 * Caller has ALREADY updated `inventory_local` optimistically with `dirty=1`.
 */
export async function enqueueInventoryDelta(delta: InventoryDelta): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO sync_queue (cromo_id, payload, created_at) VALUES (?, ?, ?)`,
    [delta.cromo_id, JSON.stringify(delta), Date.now()],
  );
  void flushQueue(); // fire and forget; respects isRunning guard
}

/**
 * Drain the queue. Each row pushes an `fn_apply_inventory_delta` RPC to
 * Supabase. Successes pop the row; failures bump `attempts` and reschedule
 * via exponential backoff. Stops on transient network errors.
 *
 * Note: the RPC `fn_apply_inventory_delta` does NOT yet exist server-side
 * (will be added in migration 0036 — Fase 5). Until then this is a no-op
 * skeleton that returns immediately.
 */
export async function flushQueue(): Promise<void> {
  if (isRunning) return;
  isRunning = true;
  try {
    const state = await NetInfo.fetch();
    if (!state.isConnected || state.isInternetReachable === false) return;

    const db = await getDatabase();
    const rows = await db.getAllAsync<SyncQueueRow>(
      `SELECT * FROM sync_queue WHERE next_retry_at IS NULL OR next_retry_at <= ? ORDER BY id ASC LIMIT 50`,
      [Date.now()],
    );

    for (const row of rows) {
      const delta = JSON.parse(row.payload) as InventoryDelta;
      const { error } = await supabase.rpc(
        // The RPC is created in migration 0036. Until then this errors gracefully.
        'fn_apply_inventory_delta' as never,
        {
          p_cromo_id: delta.cromo_id,
          p_delta_owned: delta.delta_owned,
          p_delta_pasted: delta.delta_pasted,
          p_delta_wanted: delta.delta_wanted,
        } as never,
      );

      if (error) {
        const attempts = row.attempts + 1;
        const backoffMs = Math.min(60_000, 2 ** attempts * 1000);
        await db.runAsync(
          `UPDATE sync_queue SET attempts = ?, next_retry_at = ? WHERE id = ?`,
          [attempts, Date.now() + backoffMs, row.id],
        );

        // Stop early on auth/network errors so we don't burn attempts.
        if (error.message.toLowerCase().includes('jwt')) break;
      } else {
        await db.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [row.id]);
        await db.runAsync(
          `UPDATE inventory_local SET dirty = 0 WHERE cromo_id = ?`,
          [delta.cromo_id],
        );
      }
    }
    kv.set(KvKey.lastSyncedAt, String(Date.now()));
  } finally {
    isRunning = false;
  }
}

/**
 * Install one global NetInfo listener that flushes the queue whenever the
 * device transitions to online. Idempotent — call from root layout once.
 */
export function installSyncListener(): () => void {
  if (listenerInstalled) return () => {};
  listenerInstalled = true;

  const unsub = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      void flushQueue();
    }
  });

  return () => {
    unsub();
    listenerInstalled = false;
  };
}
