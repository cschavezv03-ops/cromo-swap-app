import { createMMKV } from 'react-native-mmkv';

export const kv = createMMKV({ id: 'cromo-swap' });

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
