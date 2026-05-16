import NetInfo from '@react-native-community/netinfo';

import { supabase } from '@/lib/supabase';

import { getDatabase, type InventoryLocal } from './db';
import { kv, KvKey } from './kv';

let isRunning = false;
let listenerInstalled = false;

/**
 * Drena el inventario local pendiente (dirty=1) al servidor.
 * Estrategia: upsert directo por (user_id, cromo_id) con valores absolutos
 * — last-write-wins. No usa RPCs; aprovecha el UNIQUE constraint que ya
 * existe en `inventory_items(user_id, cromo_id)`.
 */
export async function flushDirtyInventory(): Promise<{ pushed: number; failed: number }> {
  if (isRunning) return { pushed: 0, failed: 0 };
  isRunning = true;
  try {
    const state = await NetInfo.fetch();
    if (!state.isConnected || state.isInternetReachable === false) {
      return { pushed: 0, failed: 0 };
    }

    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id;
    if (!userId) return { pushed: 0, failed: 0 };

    const db = await getDatabase();
    const rows = await db.getAllAsync<InventoryLocal>(
      `SELECT * FROM inventory_local WHERE dirty = 1 LIMIT 100`,
    );

    let pushed = 0;
    let failed = 0;

    for (const row of rows) {
      const { error } = await supabase
        .from('inventory_items')
        .upsert(
          {
            user_id: userId,
            cromo_id: row.cromo_id,
            owned_quantity: row.owned_quantity,
            pasted_quantity: row.pasted_quantity,
            wanted_quantity: row.wanted_quantity,
          },
          { onConflict: 'user_id,cromo_id' },
        );

      if (!error) {
        await db.runAsync(`UPDATE inventory_local SET dirty = 0 WHERE cromo_id = ?`, [row.cromo_id]);
        pushed++;
      } else {
        failed++;
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[sync] upsert error for', row.cromo_id, '→', error.message);
        }
        // If auth expired, abort the loop; the next reconnect will pick up.
        if (error.message.toLowerCase().includes('jwt')) break;
      }
    }

    if (pushed > 0) {
      kv.set(KvKey.lastSyncedAt, String(Date.now()));
    }
    return { pushed, failed };
  } finally {
    isRunning = false;
  }
}

/** Compatibilidad: el callsite antiguo todavía llama a esta función. */
export async function enqueueInventoryDelta(_delta: unknown): Promise<void> {
  // dirty=1 ya lo seteó inventory.ts. Solo necesitamos disparar el flush.
  void flushDirtyInventory();
}

/** Alias retro-compat. */
export const flushQueue = flushDirtyInventory;

/**
 * Suscribe el flush al cambio de red. Al volver online, intenta drenar.
 * Idempotente.
 */
export function installSyncListener(): () => void {
  if (listenerInstalled) return () => {};
  listenerInstalled = true;

  const unsub = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      void flushDirtyInventory();
    }
  });

  return () => {
    unsub();
    listenerInstalled = false;
  };
}
