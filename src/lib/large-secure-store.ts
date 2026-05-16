import * as SecureStore from 'expo-secure-store';

/**
 * SecureStore has a 2KB-per-value limit on Android. Supabase session JSON
 * (access + refresh + user) typically blows past that, so we chunk the value
 * across N sibling keys and recombine on read.
 *
 * Format: each chunk lives at `${key}/chunk/${i}`; the manifest at `${key}`
 * stores the chunk count.
 */

const CHUNK_SIZE = 1800;

function chunkKey(base: string, i: number) {
  return `${base}/chunk/${i}`;
}

async function clearChunks(base: string, knownCount?: number) {
  if (typeof knownCount === 'number') {
    await Promise.all(
      Array.from({ length: knownCount }).map((_, i) =>
        SecureStore.deleteItemAsync(chunkKey(base, i)),
      ),
    );
    return;
  }
  // Fallback: nothing if manifest is gone.
}

export const LargeSecureStore = {
  async getItem(key: string): Promise<string | null> {
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
    const existingManifest = await SecureStore.getItemAsync(key);
    const existingCount = existingManifest ? parseInt(existingManifest, 10) : 0;
    await clearChunks(key, Number.isFinite(existingCount) ? existingCount : 0);

    const chunkCount = Math.ceil(value.length / CHUNK_SIZE) || 1;
    for (let i = 0; i < chunkCount; i++) {
      const slice = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await SecureStore.setItemAsync(chunkKey(key, i), slice);
    }
    await SecureStore.setItemAsync(key, String(chunkCount));
  },

  async removeItem(key: string): Promise<void> {
    const manifest = await SecureStore.getItemAsync(key);
    if (manifest) {
      const count = parseInt(manifest, 10);
      if (Number.isFinite(count)) {
        await clearChunks(key, count);
      }
    }
    await SecureStore.deleteItemAsync(key);
  },
};
