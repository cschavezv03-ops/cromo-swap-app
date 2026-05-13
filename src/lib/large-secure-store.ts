/**
 * LargeSecureStore — AES-256-CTR encrypted session storage adapter.
 *
 * Design rationale:
 * - expo-secure-store has a 2048-byte limit; Supabase sessions exceed it.
 * - Solution: generate a random 256-bit AES key per entry, store it in SecureStore,
 *   encrypt the value with AES-CTR, store the ciphertext (hex) in AsyncStorage.
 * - AsyncStorage is ONLY used for encrypted ciphertext, never for plaintext tokens.
 *
 * Security note: No PII, tokens, or keys are ever logged.
 */

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as aesjs from 'aes-js';

const SECRET_PREFIX = 'sb-secret-';

function secretKey(key: string): string {
  return `${SECRET_PREFIX}${key}`;
}

async function setItem(key: string, value: string): Promise<void> {
  // Generate a fresh random 256-bit (32-byte) key for this entry
  const rawKeyBytes = await Crypto.getRandomBytesAsync(32);
  const encryptionKeyHex = aesjs.utils.hex.fromBytes(rawKeyBytes);

  // Persist the encryption key in hardware-backed secure store
  await SecureStore.setItemAsync(secretKey(key), encryptionKeyHex);

  // Encrypt the value with AES-256-CTR
  // Use TextEncoder for proper Unicode/emoji UTF-8 handling
  const keyBytes = aesjs.utils.hex.toBytes(encryptionKeyHex);
  const cipher = new aesjs.ModeOfOperation.ctr(keyBytes, new aesjs.Counter(1));
  const encoder = new TextEncoder();
  const valueBytes = Array.from(encoder.encode(value));
  const encrypted = cipher.encrypt(valueBytes);
  const ciphertextHex = aesjs.utils.hex.fromBytes(encrypted);

  // Store ciphertext in AsyncStorage (never plaintext)
  await AsyncStorage.setItem(key, ciphertextHex);
}

async function getItem(key: string): Promise<string | null> {
  const ciphertextHex = await AsyncStorage.getItem(key);
  if (ciphertextHex === null) return null;

  const encryptionKeyHex = await SecureStore.getItemAsync(secretKey(key));
  if (encryptionKeyHex === null) {
    // Key is gone (device wipe / reinstall) — remove stale ciphertext
    await AsyncStorage.removeItem(key);
    return null;
  }

  const keyBytes = aesjs.utils.hex.toBytes(encryptionKeyHex);
  const decipher = new aesjs.ModeOfOperation.ctr(keyBytes, new aesjs.Counter(1));
  const decryptedBytes = decipher.decrypt(aesjs.utils.hex.toBytes(ciphertextHex));
  // Use TextDecoder for proper Unicode/emoji UTF-8 handling
  const decoder = new TextDecoder();
  return decoder.decode(new Uint8Array(decryptedBytes));
}

async function removeItem(key: string): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(key),
    SecureStore.deleteItemAsync(secretKey(key)),
  ]);
}

/**
 * LargeSecureStore — compatible with Supabase's auth storage interface.
 */
export const LargeSecureStore = {
  getItem,
  setItem,
  removeItem,
};
