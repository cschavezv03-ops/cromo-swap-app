import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, Text, View } from 'react-native';

import { ListingCard } from '@/features/marketplace/components/ListingCard';
import { ListingFilters, type ListingKindFilter } from '@/features/marketplace/components/ListingFilters';
import {
  CreateListingSheet,
  type CreateListingSheetHandle,
} from '@/features/marketplace/components/CreateListingSheet';
import { useActiveListings } from '@/features/marketplace/hooks/useListings';
import { useMarketplaceRealtime } from '@/features/marketplace/hooks/useMarketplaceRealtime';
import type { ListingSummary } from '@/features/marketplace/data/listings';
import { EmptyState, Input, Screen, ScreenHeader, Skeleton, useToast } from '@/ui';

export default function MercadoTab() {
  const router = useRouter();
  const toast = useToast();
  const [kind, setKind] = useState<ListingKindFilter>('all');
  const [search, setSearch] = useState('');
  const createSheet = useRef<CreateListingSheetHandle>(null);

  // Realtime: invalida marketplace cuando alguien publica.
  useMarketplaceRealtime();

  const filters = useMemo(
    () => ({ kind, search: search.trim() }),
    [kind, search],
  );
  const listings = useActiveListings(filters);

  const data = listings.data ?? [];

  const renderItem: ListRenderItem<ListingSummary> = ({ item }) => (
    <ListingCard
      listing={item}
      onPress={() =>
        router.push({ pathname: '/(app)/listing/[id]', params: { id: item.id } })
      }
    />
  );

  return (
    <Screen>
      <ScreenHeader
        title="Mercado"
        rightSlot={
          <Pressable
            onPress={() => createSheet.current?.present()}
            hitSlop={8}
            className="h-9 px-3 items-center justify-center rounded-pill bg-text-primary"
          >
            <Text className="text-sm font-sans-bold text-bg">+ Publicar</Text>
          </Pressable>
        }
      />

      <View className="px-5 pb-3">
        <Input
          placeholder="Buscar por jugador, país o código"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      <View className="pb-3">
        <ListingFilters active={kind} onChange={setKind} />
      </View>

      {listings.isLoading ? (
        <View className="px-5 gap-3 mt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={108} rounded="md" />
          ))}
        </View>
      ) : data.length === 0 ? (
        <EmptyState
          title="Nada por aquí todavía"
          description={
            search
              ? 'No hay publicaciones que coincidan con tu búsqueda.'
              : 'Sé el primero en poner algo a la venta o a subasta.'
          }
        />
      ) : (
        <FlashList
          data={data}
          renderItem={renderItem}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={listings.isFetching && !listings.isLoading}
              onRefresh={() => void listings.refetch()}
            />
          }
        />
      )}

      <CreateListingSheet
        ref={createSheet}
        onCreated={(id) => {
          toast.show('Publicación creada.', 'success');
          router.push({ pathname: '/(app)/listing/[id]', params: { id } });
        }}
      />
    </Screen>
  );
}
