// eslint-disable-next-line import/no-unresolved
import '../../global.css';

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { QueryClientProvider } from '@tanstack/react-query';
import { fontMap } from '@/theme';
import { queryClient } from '@/lib/query-client';
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
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <SplashGate />
        <Stack screenOptions={{ headerShown: false }} />
      </SessionProvider>
    </QueryClientProvider>
  );
}
