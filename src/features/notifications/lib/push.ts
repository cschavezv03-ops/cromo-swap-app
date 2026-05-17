import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// Foreground notification handler (banner + sound).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Pide permisos y devuelve el Expo push token del device. Devuelve null si
 * el usuario denegó, si no es device físico, o si el projectId no está
 * configurado en app.config.ts.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  // Android: configurar canal de notificaciones default
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

  const tokenResp = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  return tokenResp.data;
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
