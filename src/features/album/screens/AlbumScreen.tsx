import { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Screen, Text } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useSession } from '@/features/session/SessionProvider';

import { useCatalog, useInventory } from '@/features/album/data/queries';
import { useIncrementCromo } from '@/features/album/data/mutations';
import {
  applyCountryFilter,
  applyFilter,
  computeCounts,
  distinctCountries,
  groupByCountry,
  mergeInventory,
  type AlbumFilter,
  type AlbumItem,
} from '@/features/album/lib/album';

import { CountriesBar } from '@/features/album/components/CountriesBar';
import { CountrySectionHeader } from '@/features/album/components/CountrySectionHeader';
import { CromoOptionsSheet } from '@/features/album/components/CromoOptionsSheet';
import { CromoRow } from '@/features/album/components/CromoRow';
import { FiltersBar } from '@/features/album/components/FiltersBar';
import { SobreModal } from '@/features/album/components/SobreModal';

const COLUMNS = 4;
const H_PADDING = 16;
const GAP = 8;

export function AlbumScreen() {
  const { width } = useWindowDimensions();
  const { user } = useSession();
  const userId = user?.id;

  const catalogQuery = useCatalog();
  const inventoryQuery = useInventory(userId);
  const increment = useIncrementCromo();

  const [filter, setFilter] = useState<AlbumFilter>('all');
  const [country, setCountry] = useState<string>('ALL');
  const [active, setActive] = useState<AlbumItem | null>(null);
  const [sobreOpen, setSobreOpen] = useState(false);

  const cardWidth = Math.floor((width - H_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const cardHeight = Math.floor(cardWidth * 1.33);

  const items = useMemo(
    () => mergeInventory(catalogQuery.data ?? [], inventoryQuery.data ?? []),
    [catalogQuery.data, inventoryQuery.data],
  );

  const counts = useMemo(() => computeCounts(items), [items]);
  const countries = useMemo(() => distinctCountries(items), [items]);

  const filtered = useMemo(() => {
    const byCountry = applyCountryFilter(items, country);
    return applyFilter(byCountry, filter);
  }, [items, country, filter]);

  const sections = useMemo(() => groupByCountry(filtered, COLUMNS), [filtered]);

  const sectionListData = useMemo(
    () =>
      sections.map((s) => ({
        countryCode: s.countryCode,
        countryName: s.countryName,
        flag: s.flag,
        accent: s.accent,
        total: s.total,
        owned: s.owned,
        data: s.rows,
      })),
    [sections],
  );

  const handleTap = useCallback(
    (it: AlbumItem) => {
      if (!userId || !it.id) return;
      increment.mutate({ userId, cromoId: it.id, delta: 1 });
    },
    [userId, increment],
  );

  const handleLongPress = useCallback((it: AlbumItem) => setActive(it), []);

  const openSobre = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    setSobreOpen(true);
  }, []);

  return (
    <Screen>
      <View className="px-4 pt-2">
        <View className="flex-row items-end justify-between">
          <View className="flex-1">
            <Text variant="overline">Mundial 2026</Text>
            <Text variant="h1" className="mt-1">
              El álbum
            </Text>
          </View>
          <Pressable
            onPress={openSobre}
            className={cn(
              'h-11 flex-row items-center gap-2 rounded-full px-4 bg-ink-900 active:bg-ink-800',
            )}
          >
            <Text className="text-base font-bold text-cream">+</Text>
            <Text className="text-sm font-semibold text-cream">Sobre</Text>
          </Pressable>
        </View>
      </View>

      <View className="mt-4 pl-4">
        <FiltersBar filter={filter} counts={counts} onChange={setFilter} />
      </View>
      <View className="mt-3 pl-4">
        <CountriesBar countries={countries} active={country} onChange={setCountry} />
      </View>

      <SectionList
        sections={sectionListData}
        stickySectionHeadersEnabled={false}
        keyExtractor={(row, idx) => `row-${row[0]?.id ?? idx}`}
        contentContainerStyle={{ paddingHorizontal: H_PADDING, paddingBottom: 96 }}
        renderSectionHeader={({ section }) => (
          <CountrySectionHeader
            code={section.countryCode}
            name={section.countryName}
            flag={section.flag}
            accent={section.accent}
            owned={section.owned}
            total={section.total}
          />
        )}
        renderItem={({ item: row }) => (
          <CromoRow
            items={row}
            columns={COLUMNS}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            gap={GAP}
            onTap={handleTap}
            onLongPress={handleLongPress}
          />
        )}
        ListEmptyComponent={
          catalogQuery.isLoading || inventoryQuery.isLoading ? (
            <View className="items-center py-12">
              <Text variant="bodySm">Cargando álbum…</Text>
            </View>
          ) : (
            <View className="items-center py-12">
              <Text variant="bodySm">No hay cromos en esta vista.</Text>
            </View>
          )
        }
        windowSize={11}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
      />

      <CromoOptionsSheet item={active} userId={userId} onClose={() => setActive(null)} />
      <SobreModal
        visible={sobreOpen}
        items={items}
        userId={userId}
        onClose={() => setSobreOpen(false)}
      />
    </Screen>
  );
}
