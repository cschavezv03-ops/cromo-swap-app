import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// SecureStore on Android has a 2048-byte limit per value. Supabase auth tokens
// can exceed that — so we chunk the JSON, store the chunks in SecureStore, and
// keep a thin index in AsyncStorage. Only the secrets sit in SecureStore.
const CHUNK_SIZE = 1800;
const INDEX_PREFIX = 'lss:index:';
const CHUNK_PREFIX = 'lss:chunk:';

const indexKey = (key: string) => `${INDEX_PREFIX}${key}`;
const chunkKey = (key: string, i: number) => `${CHUNK_PREFIX}${key}:${i}`;

async function clearChunks(key: string) {
  const raw = await AsyncStorage.getItem(indexKey(key));
  if (!raw) return;
  const count = Number.parseInt(raw, 10);
  if (Number.isNaN(count)) return;
  await Promise.all(
    Array.from({ length: count }, (_, i) =>
      SecureStore.deleteItemAsync(chunkKey(key, i)).catch(() => undefined),
    ),
  );
  await AsyncStorage.removeItem(indexKey(key));
}

export const LargeSecureStore = {
  async getItem(key: string): Promise<string | null> {
    const raw = await AsyncStorage.getItem(indexKey(key));
    if (!raw) return null;
    const count = Number.parseInt(raw, 10);
    if (Number.isNaN(count) || count <= 0) return null;
    const chunks: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i));
      if (part === null) return null;
      chunks.push(part);
    }
    return chunks.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    await clearChunks(key);
    const total = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < total; i++) {
      const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await SecureStore.setItemAsync(chunkKey(key, i), chunk);
    }
    await AsyncStorage.setItem(indexKey(key), String(total));
  },

  async removeItem(key: string): Promise<void> {
    await clearChunks(key);
  },
};
