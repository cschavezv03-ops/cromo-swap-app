import 'react-native-gesture-handler';
import '../global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthDeepLink } from '@/lib/deep-linking';
import { mmkvPersister, queryClient } from '@/lib/query-client';
import { ensureCatalogSeeded } from '@/features/storage/seeds';
import { installSyncListener } from '@/features/storage/sync';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { ToastProvider } from '@/ui/Toast';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister: mmkvPersister, maxAge: 1000 * 60 * 60 * 24 * 7 }}
          >
            <BottomSheetModalProvider>
              <ToastProvider>
                <AppBoot>
                  <ThemedStack />
                </AppBoot>
              </ToastProvider>
            </BottomSheetModalProvider>
          </PersistQueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppBoot({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useAuthDeepLink();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await ensureCatalogSeeded();
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'unknown boot error');
        }
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.error('[boot]', err);
        }
      } finally {
        if (mounted) setReady(true);
      }
    })();

    const cleanup = installSyncListener();
    return () => {
      mounted = false;
      cleanup();
    };
  }, []);

  if (!ready) {
    return <BootSplash error={error} />;
  }
  return <>{children}</>;
}

function BootSplash({ error }: { error: string | null }) {
  return (
    <View className="flex-1 items-center justify-center bg-bg px-8">
      <Text className="text-2xl font-sans-black text-text-primary">Cromo Swap</Text>
      <Text className="mt-2 text-sm text-text-tertiary font-sans">Preparando tu álbum…</Text>
      <ActivityIndicator className="mt-4" />
      {error && (
        <Text className="mt-6 text-center text-xs text-danger font-sans">
          Error iniciando: {error}
        </Text>
      )}
    </View>
  );
}

function ThemedStack() {
  const { mode, colors } = useTheme();
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}
      />
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </>
  );
}
