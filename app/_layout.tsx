import 'react-native-gesture-handler';
import '../global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PostHogProvider } from 'posthog-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthDeepLink } from '@/lib/deep-linking';
import { queryClient, queryPersister } from '@/lib/query-client';
import { kv } from '@/features/storage/kv';
import { ensureCatalogSeeded } from '@/features/storage/seeds';
import { installSyncListener } from '@/features/storage/sync';
import { posthog } from '@/config/posthog';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { ErrorBoundary } from '@/ui/ErrorBoundary';
import { ToastProvider } from '@/ui/Toast';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PostHogProvider
          client={posthog}
          autocapture={{ captureScreens: false, captureTouches: false }}
        >
          <ThemeProvider>
            <PersistQueryClientProvider
              client={queryClient}
              persistOptions={{ persister: queryPersister, maxAge: 1000 * 60 * 60 * 24 * 7 }}
            >
              <BottomSheetModalProvider>
                <ToastProvider>
                  <ErrorBoundary>
                    <AppBoot>
                      <ScreenTracker />
                      <ThemedStack />
                    </AppBoot>
                  </ErrorBoundary>
                </ToastProvider>
              </BottomSheetModalProvider>
            </PersistQueryClientProvider>
          </ThemeProvider>
        </PostHogProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ScreenTracker() {
  const pathname = usePathname();
  const previousPathname = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      // Solo el pathname — no incluimos params porque contienen UUIDs (PII).
      posthog.screen(pathname, {
        previous_screen: previousPathname.current ?? null,
      });
      previousPathname.current = pathname;
    }
  }, [pathname]);

  return null;
}

function AppBoot({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useAuthDeepLink();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // 1) Hydrate the sync KV cache from AsyncStorage so any sync getString
        //    call below returns the right value.
        await kv.load();
        // 2) Seed/upgrade the local SQLite catalog from the bundled JSON.
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
      <Text className="font-sans-black text-2xl text-text-primary">Cromo Swap</Text>
      <Text className="mt-2 font-sans text-sm text-text-tertiary">Preparando tu álbum…</Text>
      <ActivityIndicator className="mt-4" />
      {error && (
        <Text className="mt-6 text-center font-sans text-xs text-danger">
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
