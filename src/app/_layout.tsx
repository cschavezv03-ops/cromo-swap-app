// eslint-disable-next-line import/no-unresolved
import '../../global.css';

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { fontMap } from '@/theme';
import {
  queryClient,
  asyncStoragePersister,
  PERSIST_BUSTER,
  PERSIST_MAX_AGE,
} from '@/lib/query-client';
import { SessionProvider, useSession } from '@/lib/session-context';

// Keep splash visible until fonts + session are ready
SplashScreen.preventAutoHideAsync();

function SplashGate() {
  const { sessionResolved } = useSession();
  const [fontsLoaded] = useFonts(fontMap);

  useEffect(() => {
    if (fontsLoaded && sessionResolved) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, sessionResolved]);

  return null;
}

export default function RootLayout() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        maxAge: PERSIST_MAX_AGE,
        buster: PERSIST_BUSTER,
        // Don't persist mutations (offline-mutation queue is a separate
        // feature). Catalog + inventory queries are what matters for
        // local-first first paint.
        dehydrateOptions: {
          shouldDehydrateMutation: () => false,
        },
      }}
    >
      <SessionProvider>
        <SplashGate />
        <Stack screenOptions={{ headerShown: false }} />
      </SessionProvider>
    </PersistQueryClientProvider>
  );
}
