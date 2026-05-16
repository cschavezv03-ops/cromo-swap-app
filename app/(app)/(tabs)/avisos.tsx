import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { NotificationRow } from '@/features/notifications/components/NotificationRow';
import type { NotificationPayload } from '@/features/notifications/data/notifications';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useMyNotifications,
} from '@/features/notifications/hooks/useNotifications';
import { EmptyState, Screen, ScreenHeader, Skeleton } from '@/ui';

export default function AvisosTab() {
  const router = useRouter();
  const list = useMyNotifications();
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const items = list.data ?? [];
  const unread = items.filter((n) => !n.read).length;

  // Refetch al montar para asegurar que pull-to-refresh no es la única
  // forma de ver lo nuevo.
  useEffect(() => {
    void list.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTap = (id: string, kind: string, payload: NotificationPayload) => {
    if (!items.find((n) => n.id === id)?.read) markOne.mutate(id);

    if (kind.startsWith('match') && payload.match_id) {
      // El match referencia counterparty_id en el reason del row de matches;
      // de momento navegamos al match detail por counterparty si lo tenemos.
      if (payload.counterparty_id) {
        router.push({ pathname: '/(app)/match/[id]', params: { id: payload.counterparty_id } });
      }
    } else if (kind.startsWith('transaction') && payload.transaction_id) {
      router.push({
        pathname: '/(app)/transaction/[id]',
        params: { id: payload.transaction_id },
      });
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title="Avisos"
        rightSlot={
          unread > 0 ? (
            <Pressable
              onPress={() => markAll.mutate()}
              hitSlop={6}
              disabled={markAll.isPending}
            >
              <Text className="text-sm font-sans-semibold text-accent">
                Marcar todo
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={list.isFetching && !list.isLoading}
            onRefresh={() => void list.refetch()}
          />
        }
      >
        {list.isLoading && (
          <View className="px-5 mt-3 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={60} rounded="md" />
            ))}
          </View>
        )}

        {!list.isLoading && items.length === 0 && (
          <EmptyState
            title="No hay avisos por ahora"
            description="Aquí verás cuando alguien te proponga un intercambio, acepte tu propuesta o cuando llegue un match nuevo."
          />
        )}

        {items.map((n, i, arr) => (
          <NotificationRow
            key={n.id}
            notification={n}
            isLast={i === arr.length - 1}
            onPress={() =>
              handleTap(n.id, n.kind, (n.payload as NotificationPayload) ?? {})
            }
          />
        ))}
      </ScrollView>
    </Screen>
  );
}
