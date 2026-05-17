import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { universitiesById } from '@/features/auth/lib/universities';
import { useMyTransactions } from '@/features/transactions/hooks/useTransactions';
import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, EmptyState, Screen, ScreenHeader, Skeleton } from '@/ui';

const KIND_LABEL: Record<string, string> = {
  trade: 'Intercambio',
  sale: 'Venta',
  package: 'Paquete',
  auction_settlement: 'Subasta',
};

const STATUS_LABEL: Record<string, string> = {
  completed: 'Completada',
  cancelled: 'Cancelada',
  expired: 'Expirada',
};

export default function TransactionHistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const txs = useMyTransactions();

  const closed = useMemo(
    () =>
      (txs.data ?? [])
        .filter((t) => t.status === 'completed' || t.status === 'cancelled' || t.status === 'expired')
        .sort(
          (a, b) =>
            new Date(b.completed_at ?? b.cancelled_at ?? b.updated_at).getTime() -
            new Date(a.completed_at ?? a.cancelled_at ?? a.updated_at).getTime(),
        ),
    [txs.data],
  );

  return (
    <Screen>
      <ScreenHeader title="Histórico" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {txs.isLoading && (
          <View className="gap-2 px-5 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={56} rounded="md" />
            ))}
          </View>
        )}
        {!txs.isLoading && closed.length === 0 && (
          <EmptyState
            title="Sin historial"
            description="Cuando completes o canceles tu primer intercambio aparecerá acá."
          />
        )}
        {closed.map((tx) => {
          const cp = tx.counterparty;
          const uni = cp?.university ? universitiesById[cp.university] : null;
          const when = tx.completed_at ?? tx.cancelled_at ?? tx.updated_at;
          const kindLabel = KIND_LABEL[tx.kind] ?? tx.kind;
          const statusLabel = STATUS_LABEL[tx.status] ?? tx.status;
          const tone =
            tx.status === 'completed'
              ? 'text-success'
              : tx.status === 'cancelled'
                ? 'text-danger'
                : 'text-text-tertiary';
          return (
            <Pressable
              key={tx.id}
              onPress={() =>
                router.push({ pathname: '/(app)/transaction/[id]', params: { id: tx.id } })
              }
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              }}
            >
              <Avatar url={cp?.avatar_url ?? null} name={cp?.display_name ?? '?'} size={40} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View className="flex-row items-center gap-2">
                  <Text
                    className="text-base font-sans-semibold text-text-primary"
                    numberOfLines={1}
                  >
                    {cp?.display_name ?? 'Usuario'}
                  </Text>
                  {uni && (
                    <Text
                      className="text-[11px] font-sans-semibold"
                      style={{ color: uni.color }}
                    >
                      {uni.short}
                    </Text>
                  )}
                </View>
                <Text className="mt-0.5 text-xs font-sans text-text-secondary">
                  {kindLabel}
                  {tx.final_price ? ` · $${Number(tx.final_price).toFixed(2)}` : ''}
                  {when ? ` · ${formatDate(when)}` : ''}
                </Text>
              </View>
              <Text className={`text-xs font-sans-semibold ${tone}`}>{statusLabel}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}
