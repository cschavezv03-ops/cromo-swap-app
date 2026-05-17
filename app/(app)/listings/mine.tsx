import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ListingCard } from '@/features/marketplace/components/ListingCard';
import { useMyListings } from '@/features/marketplace/hooks/useListings';
import type { ListingSummary } from '@/features/marketplace/data/listings';
import { Chip, EmptyState, Screen, ScreenHeader, Skeleton } from '@/ui';

type Tab = 'active' | 'sold' | 'cancelled';

export default function MyListingsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('active');
  const list = useMyListings();

  const buckets = useMemo(() => {
    const all = list.data ?? [];
    const active: ListingSummary[] = [];
    const sold: ListingSummary[] = [];
    const cancelled: ListingSummary[] = [];
    for (const l of all) {
      if (l.status === 'active' || l.status === 'reserved') active.push(l);
      else if (l.status === 'completed') sold.push(l);
      else cancelled.push(l);
    }
    return { active, sold, cancelled };
  }, [list.data]);

  const visible = buckets[tab];

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Mis publicaciones" onBack={() => router.back()} />
      <View className="flex-row gap-2 px-5 pb-3">
        <Chip
          label="Activas"
          count={buckets.active.length}
          variant={tab === 'active' ? 'selected' : 'outline'}
          size="sm"
          onPress={() => setTab('active')}
        />
        <Chip
          label="Vendidas"
          count={buckets.sold.length}
          variant={tab === 'sold' ? 'selected' : 'outline'}
          size="sm"
          onPress={() => setTab('sold')}
        />
        <Chip
          label="Canceladas"
          count={buckets.cancelled.length}
          variant={tab === 'cancelled' ? 'selected' : 'outline'}
          size="sm"
          onPress={() => setTab('cancelled')}
        />
      </View>

      {list.isLoading ? (
        <View className="px-5 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={108} rounded="md" />
          ))}
        </View>
      ) : visible.length === 0 ? (
        <EmptyState
          title={
            tab === 'active'
              ? 'No tienes publicaciones activas'
              : tab === 'sold'
                ? 'Sin ventas todavía'
                : 'Sin publicaciones canceladas'
          }
          description={
            tab === 'active'
              ? 'Publica tu primer cromo desde el tab Mercado.'
              : tab === 'sold'
                ? 'Cuando completes una venta aparecerá aquí.'
                : 'Las publicaciones que canceles aparecerán acá.'
          }
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          {visible.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              onPress={() =>
                router.push({ pathname: '/(app)/listing/[id]', params: { id: l.id } })
              }
            />
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
