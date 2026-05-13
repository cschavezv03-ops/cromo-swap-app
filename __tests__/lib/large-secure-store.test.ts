/**
 * TDD tests for LargeSecureStore AES-256-CTR adapter.
 *
 * Contracts:
 * 1. Round-trip: setItem(key, value) then getItem(key) returns the original value
 * 2. Encryption: AsyncStorage never receives plaintext JSON
 * 3. removeItem: clears both AsyncStorage ciphertext and SecureStore key
 */

// --- Mocks ---

const mockAsyncStorageStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockAsyncStorageStore[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      mockAsyncStorageStore[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete mockAsyncStorageStore[key];
      return Promise.resolve();
    }),
  },
}));

const mockSecureStore: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn((key: string, value: string) => {
    mockSecureStore[key] = value;
    return Promise.resolve();
  }),
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockSecureStore[key] ?? null)),
  deleteItemAsync: jest.fn((key: string) => {
    delete mockSecureStore[key];
    return Promise.resolve();
  }),
}));

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn((size: number) => {
    // Return deterministic bytes for testing
    const bytes = new Uint8Array(size);
    for (let i = 0; i < size; i++) bytes[i] = (i * 37 + 13) % 256;
    return Promise.resolve(bytes);
  }),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LargeSecureStore } from '../../src/lib/large-secure-store';

beforeEach(() => {
  // Clear stores between tests
  Object.keys(mockAsyncStorageStore).forEach((k) => delete mockAsyncStorageStore[k]);
  Object.keys(mockSecureStore).forEach((k) => delete mockSecureStore[k]);
  jest.clearAllMocks();
  // Re-bind the mock getItem to updated store state
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(mockAsyncStorageStore[key] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
    mockAsyncStorageStore[key] = value;
    return Promise.resolve();
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
    delete mockAsyncStorageStore[key];
    return Promise.resolve();
  });
});

describe('LargeSecureStore', () => {
  describe('round-trip: setItem → getItem', () => {
    it('returns the original value after encrypt/decrypt cycle', async () => {
      const key = 'supabase.auth.token';
      const value = JSON.stringify({ access_token: 'tok_abc123', refresh_token: 'ref_xyz789' });

      await LargeSecureStore.setItem(key, value);
      const result = await LargeSecureStore.getItem(key);

      expect(result).toBe(value);
    });

    it('handles unicode and special characters correctly', async () => {
      const key = 'test-unicode';
      const value = 'Álbum WC 2026 — cromos: {"emoji":"🎴"}';

      await LargeSecureStore.setItem(key, value);
      const result = await LargeSecureStore.getItem(key);

      expect(result).toBe(value);
    });
  });

  describe('encryption at rest', () => {
    it('stores ciphertext in AsyncStorage, not plaintext', async () => {
      const key = 'supabase.auth.token';
      const value = '{"access_token":"plaintext-token"}';

      await LargeSecureStore.setItem(key, value);

      const storedInAsyncStorage = mockAsyncStorageStore[key];
      // Must be stored (ciphertext present)
      expect(storedInAsyncStorage).toBeDefined();
      // Must NOT be the plaintext JSON
      expect(storedInAsyncStorage).not.toBe(value);
      expect(storedInAsyncStorage).not.toContain('plaintext-token');
      expect(storedInAsyncStorage).not.toContain('access_token');
    });

    it('stores the encryption key in SecureStore under sb-secret- prefix', async () => {
      const key = 'supabase.auth.token';
      await LargeSecureStore.setItem(key, 'some-session-value');

      expect(mockSecureStore[`sb-secret-${key}`]).toBeDefined();
    });
  });

  describe('removeItem', () => {
    it('clears both AsyncStorage ciphertext and SecureStore key', async () => {
      const key = 'supabase.auth.token';
      await LargeSecureStore.setItem(key, 'session-data');

      // Verify stored before removal
      expect(mockAsyncStorageStore[key]).toBeDefined();
      expect(mockSecureStore[`sb-secret-${key}`]).toBeDefined();

      await LargeSecureStore.removeItem(key);

      expect(mockAsyncStorageStore[key]).toBeUndefined();
      expect(mockSecureStore[`sb-secret-${key}`]).toBeUndefined();
    });

    it('returns null after item is removed', async () => {
      const key = 'supabase.auth.token';
      await LargeSecureStore.setItem(key, 'some-value');
      await LargeSecureStore.removeItem(key);

      const result = await LargeSecureStore.getItem(key);
      expect(result).toBeNull();
    });
  });

  describe('getItem edge cases', () => {
    it('returns null for non-existent key', async () => {
      const result = await LargeSecureStore.getItem('non-existent');
      expect(result).toBeNull();
    });

    it('returns null and cleans up if SecureStore key is missing but AsyncStorage has ciphertext', async () => {
      const key = 'orphaned-ciphertext';
      // Manually add ciphertext to AsyncStorage without the SecureStore key
      mockAsyncStorageStore[key] = 'deadbeef';

      const result = await LargeSecureStore.getItem(key);

      expect(result).toBeNull();
      // Stale ciphertext should be cleaned up
      expect(mockAsyncStorageStore[key]).toBeUndefined();
    });
  });
});
