import { useCallback, useMemo, useState } from 'react';
import { SectionList, View, useWindowDimensions } from 'react-native';

import { Button, Pill, Screen, Text } from '@/shared/ui';
import { useSession } from '@/features/session/SessionProvider';
import { useCatalog, useInventory } from '@/features/album/data/queries';
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
import { AllChip, CountryChip } from '@/features/album/components/CountryChip';
import { CountrySectionHeader } from '@/features/album/components/CountrySectionHeader';
import { CromoRow } from '@/features/album/components/CromoRow';
import { CromoSheet } from '@/features/album/components/CromoSheet';

const COLUMNS = 4;
const H_PADDING = 16;
const GAP = 8;

export function AlbumScreen() {
  const { width } = useWindowDimensions();
  const { user } = useSession();
  const userId = user?.id;

  const catalogQuery = useCatalog();
  const inventoryQuery = useInventory(userId);

  const [filter, setFilter] = useState<AlbumFilter>('all');
  const [country, setCountry] = useState<string>('ALL');
  const [active, setActive] = useState<AlbumItem | null>(null);

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

  const onItemPress = useCallback((it: AlbumItem) => setActive(it), []);

  return (
    <>
      <Screen>
        <View className="px-4 pt-2">
          <Text variant="overline">Mundial 2026</Text>
          <View className="mt-1 flex-row items-end justify-between">
            <Text variant="h1">El álbum</Text>
            <View className="flex-row items-center gap-2">
              <Button label="+ Sobre" size="sm" onPress={() => {}} />
            </View>
          </View>
        </View>

        <SectionList
          stickySectionHeadersEnabled={false}
          sections={sectionListData}
          keyExtractor={(row, idx) => `${row[0]?.id ?? 'row'}-${idx}`}
          contentContainerStyle={{ paddingHorizontal: H_PADDING, paddingBottom: 96 }}
          ListHeaderComponent={
            <View className="pb-2 pt-4">
              <View className="flex-row gap-2">
                <Pill
                  label="Todos"
                  count={counts.total}
                  active={filter === 'all'}
                  onPress={() => setFilter('all')}
                />
                <Pill
                  label="Faltan"
                  count={counts.missing}
                  active={filter === 'missing'}
                  onPress={() => setFilter('missing')}
                />
                <Pill
                  label="Repetidos"
                  count={counts.repeated}
                  active={filter === 'repeated'}
                  onPress={() => setFilter('repeated')}
                />
                <Pill
                  label="Tengo"
                  count={counts.owned}
                  active={filter === 'have'}
                  onPress={() => setFilter('have')}
                />
              </View>
              <View className="-mx-4 mt-3 flex-row gap-2 px-4">
                <View className="flex-row gap-2">
                  <AllChip active={country === 'ALL'} onPress={() => setCountry('ALL')} />
                  {countries.map((c) => (
                    <CountryChip
                      key={c.code}
                      flag={c.flag}
                      code={c.code}
                      active={country === c.code}
                      onPress={() => setCountry(c.code)}
                    />
                  ))}
                </View>
              </View>
            </View>
          }
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
              onItemPress={onItemPress}
            />
          )}
          ListEmptyComponent={
            catalogQuery.isLoading ? (
              <View className="items-center py-12">
                <Text variant="bodySm">Cargando álbum…</Text>
              </View>
            ) : (
              <View className="items-center py-12">
                <Text variant="bodySm">No hay cromos en esta vista.</Text>
              </View>
            )
          }
          windowSize={9}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          removeClippedSubviews
        />

        <CromoSheet item={active} userId={userId} onClose={() => setActive(null)} />
      </Screen>
    </>
  );
}
