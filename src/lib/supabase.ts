import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';
import { LargeSecureStore } from './large-secure-store';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn('[supabase] missing URL or anon key — create .env from .env.example.');
}

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'https://invalid.supabase.co',
  SUPABASE_ANON_KEY || 'invalid',
  {
    auth: {
      storage: LargeSecureStore,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  },
);

// Tell Supabase to refresh the JWT as the app comes back to foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
