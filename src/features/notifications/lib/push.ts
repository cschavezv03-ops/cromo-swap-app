import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/**
 * Expo Go (SDK 53+) NO soporta push remoto en Android. En ese entorno
 * NI SIQUIERA importamos `expo-notifications`, porque el módulo crashea
 * al inicializarse. Solo cargamos el módulo cuando corremos en un dev
 * build / standalone / iOS-bare.
 */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Foreground notification handler — solo se configura fuera de Expo Go.
if (!isExpoGo) {
  // Carga perezosa para que el `import` no se evalúe en Expo Go.
  // Wrap en try/catch por si el módulo no está disponible (web, etc.).
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch {
    /* expo-notifications no disponible — entorno sin push */
  }
}

/**
 * Pide permisos y devuelve el Expo push token del device. Devuelve null si:
 *   - corremos en Expo Go (no soportado desde SDK 53)
 *   - no es device físico
 *   - el user denegó permisos
 *   - no hay projectId configurado
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (isExpoGo) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[push] skipped: running in Expo Go (use a dev build for push)');
    }
    return null;
  }

  let Notifications: typeof import('expo-notifications');
  let Device: typeof import('expo-device');
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require('expo-notifications');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Device = require('expo-device');
  } catch {
    return null;
  }

  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Cromo Swap',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
      });
    } catch {
      /* canal opcional */
    }
  }

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.status === 'granted';
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.status === 'granted';
  }
  if (!granted) return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined;

  try {
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenResp.data;
  } catch (err) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[push] getExpoPushTokenAsync failed:', err);
    }
    return null;
  }
}

/** Persiste el token al server via RPC `fn_set_push_token`. */
export async function persistPushToken(token: string | null): Promise<void> {
  const { error } = await supabase.rpc('fn_set_push_token', {
    p_token: token ?? '',
  });
  if (error && __DEV__) {
    // eslint-disable-next-line no-console
    console.warn('[push] persistPushToken error:', error.message);
  }
}
