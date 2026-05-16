import * as SecureStore from 'expo-secure-store';

/**
 * SecureStore has a 2KB-per-value limit on Android and only accepts keys
 * matching /^[A-Za-z0-9._-]+$/. Supabase session JSON (access + refresh +
 * user) typically blows past 2KB, so we chunk the value across N sibling
 * keys and recombine on read.
 *
 * Format: each chunk lives at `${key}.chunk.${i}`; the manifest at `${key}`
 * stores the chunk count.
 */

const CHUNK_SIZE = 1800;

function chunkKey(base: string, i: number): string {
  return `${base}.chunk.${i}`;
}

function assertKey(key: string): void {
  if (!key || key.length === 0) {
    throw new Error('LargeSecureStore: key must not be empty');
  }
}

async function clearChunks(base: string, knownCount: number): Promise<void> {
  if (knownCount <= 0) return;
  await Promise.all(
    Array.from({ length: knownCount }).map((_, i) =>
      SecureStore.deleteItemAsync(chunkKey(base, i)).catch(() => {}),
    ),
  );
}

export const LargeSecureStore = {
  async getItem(key: string): Promise<string | null> {
    assertKey(key);
    const manifest = await SecureStore.getItemAsync(key);
    if (!manifest) return null;
    const count = parseInt(manifest, 10);
    if (!Number.isFinite(count) || count < 1) return null;
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i));
      if (part === null) return null;
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    assertKey(key);
    const existingManifest = await SecureStore.getItemAsync(key);
    const existingCount = existingManifest ? parseInt(existingManifest, 10) : 0;
    await clearChunks(key, Number.isFinite(existingCount) ? existingCount : 0);

    const chunkCount = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
    for (let i = 0; i < chunkCount; i++) {
      const slice = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await SecureStore.setItemAsync(chunkKey(key, i), slice);
    }
    await SecureStore.setItemAsync(key, String(chunkCount));
  },

  async removeItem(key: string): Promise<void> {
    assertKey(key);
    const manifest = await SecureStore.getItemAsync(key);
    if (manifest) {
      const count = parseInt(manifest, 10);
      if (Number.isFinite(count)) {
        await clearChunks(key, count);
      }
    }
    await SecureStore.deleteItemAsync(key).catch(() => {});
  },
};
