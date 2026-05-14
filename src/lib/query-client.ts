/**
 * Shared QueryClient + AsyncStorage-backed persister.
 *
 * Why persistence (local-first):
 *   The album view fetches catalog + inventory from Supabase on every cold
 *   start. That's a network round-trip in the critical path of the first
 *   paint — feels slow even on a fast connection. With persistence we save
 *   every successful query to disk (AsyncStorage) and rehydrate on startup,
 *   so the album paints from disk instantly while Supabase revalidates in
 *   the background. Stale-while-revalidate, in one line of config.
 *
 * Key knobs:
 *   - `gcTime` (formerly `cacheTime`): how long the cache survives WITHOUT
 *     observers. Default 5 min is too short — disk-persisted data would
 *     drop out of memory before rehydration finishes. Set to 24h.
 *   - `staleTime`: when data is considered "fresh". Per-query default; we
 *     keep the existing per-query overrides (catalog: Infinity, inventory: 30s).
 *   - `maxAge` (on persister): how long the disk snapshot remains valid.
 *     Set to 7 days — after that the snapshot is discarded and we refetch.
 *   - `buster`: bumps to invalidate ALL persisted cache when shipping a
 *     breaking schema change (e.g. catalog version bump).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: ONE_DAY_MS, // keep cache resident long enough for rehydration
      retry: 1,
    },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'cromos.query-cache.v1', // bump suffix to invalidate persisted cache
  throttleTime: 1000, // batch writes to disk
});

/**
 * Bump when a schema change makes old persisted data unsafe to rehydrate.
 * Same name across the app — bumping invalidates EVERY persisted entry.
 */
export const PERSIST_BUSTER = 'v1';

/** Hard ceiling for any persisted snapshot. */
export const PERSIST_MAX_AGE = SEVEN_DAYS_MS;
