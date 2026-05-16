import * as Linking from 'expo-linking';
import { useEffect } from 'react';

import { supabase } from './supabase';

/**
 * Mounts a listener that handles `cromoswap://auth/callback?code=...&type=...`
 * URLs from magic links. When detected, exchanges the code for a Supabase
 * session and persists it via the auth client.
 *
 * Returns an effect cleanup function (also auto-cleans on unmount).
 */
export function useAuthDeepLink() {
  useEffect(() => {
    let cancelled = false;

    async function handleUrl(url: string | null) {
      if (!url || cancelled) return;
      try {
        const parsed = Linking.parse(url);
        if (parsed.hostname !== 'auth') return;
        const params = parsed.queryParams ?? {};
        const code = typeof params.code === 'string' ? params.code : undefined;
        if (!code) return;
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error && __DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[deep-link] exchangeCodeForSession failed:', error.message);
        }
      } catch (err) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[deep-link] failed to handle url:', err);
        }
      }
    }

    // Cold start: did the app open via a deep link?
    void Linking.getInitialURL().then(handleUrl);

    // Warm: app is already running and a deep link arrives.
    const sub = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);
}
