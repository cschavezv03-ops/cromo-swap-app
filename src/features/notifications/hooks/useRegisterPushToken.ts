import { useEffect } from 'react';

import { useSession } from '@/features/auth/hooks/useSession';

import {
  persistPushToken,
  registerForPushNotificationsAsync,
} from '../lib/push';

/**
 * Hook a montar UNA vez en el layout protegido. Cuando hay sesión, pide
 * permisos de notificaciones, obtiene el Expo push token y lo persiste
 * en `profiles.expo_push_token` via RPC.
 *
 * Idempotente: el RPC actualiza si el token cambió o lo elimina si null.
 */
export function useRegisterPushToken(): void {
  const { user } = useSession();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (cancelled) return;
        await persistPushToken(token);
      } catch (err) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[push] register error:', err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);
}
