import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Sync-API KV store backed by AsyncStorage.
 *
 * Reads are sync (Map lookup); writes go to the cache immediately and
 * fire-and-forget to AsyncStorage in the background. Call `await kv.load()`
 * once at boot before anything tries to read.
 *
 * Note: this replaces react-native-mmkv (which uses NitroModules — not
 * available in Expo Go SDK 55). For 99% of in-app reads the cache hit
 * keeps things zero-latency.
 */
class SyncKvCache {
  private cache = new Map<string, string>();
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  load(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = (async () => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const pairs = await AsyncStorage.multiGet(keys);
        for (const [k, v] of pairs) {
          if (v !== null) this.cache.set(k, v);
        }
      } finally {
        this.loaded = true;
      }
    })();
    return this.loadPromise;
  }

  get isLoaded(): boolean {
    return this.loaded;
  }

  getString(key: string): string | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: string | number | boolean): void {
    const str = typeof value === 'string' ? value : String(value);
    this.cache.set(key, str);
    AsyncStorage.setItem(key, str).catch(() => {
      /* persist failure is non-fatal — cache is source of truth in-session */
    });
  }

  remove(key: string): void {
    this.cache.delete(key);
    AsyncStorage.removeItem(key).catch(() => {});
  }

  /** Wipe everything. Used on sign-out to forget user-specific state. */
  async clear(): Promise<void> {
    this.cache.clear();
    await AsyncStorage.clear();
  }
}

export const kv = new SyncKvCache();

export const KvKey = {
  themeOverride: 'app.themeOverride',
  catalogVersion: 'catalog.version',
  lastSyncedAt: 'sync.lastSyncedAt',
  album: {
    lastFilter: 'album.lastFilter',
    selectedCountries: 'album.selectedCountries',
  },
  session: {
    lastUserId: 'session.lastUserId',
  },
} as const;

export function readString(key: string): string | undefined {
  return kv.getString(key);
}

export function writeString(key: string, value: string): void {
  kv.set(key, value);
}

export function readJson<T>(key: string): T | null {
  const raw = kv.getString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  kv.set(key, JSON.stringify(value));
}

export function remove(key: string): void {
  kv.remove(key);
}
