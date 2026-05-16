import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { type Persister } from '@tanstack/react-query-persist-client';
import NetInfo from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';

import { kv } from '@/features/storage/kv';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 2,
      refetchOnWindowFocus: true,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});

// Bridge React Native foreground state into TanStack Query's focus manager.
function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === 'active');
}
AppState.addEventListener('change', onAppStateChange);

// Bridge NetInfo into TanStack Query's online manager.
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
  });
});

const PERSISTOR_KEY = 'tanstack.persist.v1';

export const mmkvPersister: Persister = {
  persistClient: async (client) => {
    kv.set(PERSISTOR_KEY, JSON.stringify(client));
  },
  restoreClient: async () => {
    const raw = kv.getString(PERSISTOR_KEY);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  },
  removeClient: async () => {
    kv.remove(PERSISTOR_KEY);
  },
};
