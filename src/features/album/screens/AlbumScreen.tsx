import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Dimensions,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, ProgressBar, Screen, ScreenHeader, useToast } from '@/ui';
import { useTheme } from '@/theme/ThemeProvider';

import { CountryChips } from '../components/CountryChips';
import { CromoCard } from '../components/CromoCard';
import { CromoSheet, type CromoSheetHandle } from '../components/CromoSheet';
import { FilterTabs } from '../components/FilterTabs';
import { SearchBar } from '../components/SearchBar';
import { SectionMark } from '../components/SectionMark';
import { SobreSheet, type SobreSheetHandle } from '../components/SobreSheet';
import { loadAllCountries } from '../data/catalog';
import { pullRemoteInventory } from '../data/inventory';
import { albumQueryKey, useFilteredAlbum } from '../hooks/useAlbumData';
import { useFiltersHydration, useFiltersStore } from '../hooks/useFilters';
import { useDecrementOwned, useIncrementOwned } from '../hooks/useInventoryMutation';
import { SPECIAL_SECTIONS, SPECIAL_SECTION_HINTS } from '../lib/sections';
import type {
  AlbumCromo,
  CountryMeta,
  CountrySectionData,
} from '../lib/types';

const SCREEN_PADDING = 20;
const COLS = 4;
const CARD_GAP = 8;
const ROW_VERTICAL_GAP = 8;
const HEADER_HEIGHT = 52;

type ListItem =
  | { type: 'header'; key: string; section: CountrySectionData }
  | {
      type: 'row';
      key: string;
      country: CountryMeta;
      cromos: AlbumCromo[];
    };

function flattenSections(sections: CountrySectionData[]): ListItem[] {
  const items: ListItem[] = [];
  for (const s of sections) {
    items.push({ type: 'header', key: `h-${s.country.code}`, section: s });
    for (let i = 0; i < s.cromos.length; i += COLS) {
      items.push({
        type: 'row',
        key: `r-${s.country.code}-${i}`,
        country: s.country,
        cromos: s.cromos.slice(i, i + COLS),
      });
    }
  }
  return items;
}

export function AlbumScreen() {
  const toast = useToast();
  useFiltersHydration();
  const tab = useFiltersStore((s) => s.tab);
  const selectedCountries = useFiltersStore((s) => s.selectedCountries);
  const setTab = useFiltersStore((s) => s.setTab);
  const toggleCountry = useFiltersStore((s) => s.toggleCountry);
  const clearCountries = useFiltersStore((s) => s.clearCountries);

  const { sections, stats, isLoading, isSearching } = useFilteredAlbum();
  const search = useFiltersStore((s) => s.search);
  const setSearch = useFiltersStore((s) => s.setSearch);
  const clearSearch = useFiltersStore((s) => s.clearSearch);
  const cromoSheetRef = useRef<CromoSheetHandle>(null);
  const sobreSheetRef = useRef<SobreSheetHandle>(null);
  const inc = useIncrementOwned();
  const dec = useDecrementOwned();
  const qc = useQueryClient();

  const countriesQ = useQuery({
    queryKey: ['album', 'countries'],
    queryFn: async (): Promise<CountryMeta[]> => {
      const rows = await loadAllCountries();
      return rows.map((c) => ({
        code: c.code,
        name: c.name,
        stripe: c.stripe,
        accent: c.accent,
        flag_emoji: c.flag_emoji,
      }));
    },
    staleTime: 1000 * 60 * 60,
  });
  const countries = countriesQ.data ?? [];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const n = await pullRemoteInventory();
        if (!cancelled && n > 0) {
          void qc.invalidateQueries({ queryKey: albumQueryKey });
        }
      } catch {
        /* offline o sin sesión */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [qc]);

  const cardWidth = useMemo(() => {
    const w = Dimensions.get('window').width - SCREEN_PADDING * 2 - CARD_GAP * (COLS - 1);
    return Math.floor(w / COLS);
  }, []);

  // Lookup O(1) por country_code (para CromoSheet).
  const countryByCode = useMemo(() => {
    const m = new Map<string, CountryMeta>();
    for (const c of countries) m.set(c.code, c);
    return m;
  }, [countries]);

  const handlePressCromo = useCallback(
    (cromo: AlbumCromo) => {
      inc.mutate(cromo.id, {
        onError: (err) => {
          toast.show(err instanceof Error ? err.message : 'No se pudo actualizar.', 'danger');
        },
      });
    },
    [inc, toast],
  );

  const handleLongPress = useCallback(
    (cromo: AlbumCromo) => {
      const country =
        (cromo.country_code ? countryByCode.get(cromo.country_code) : null) ?? null;
      cromoSheetRef.current?.present(cromo, country);
    },
    [countryByCode],
  );

  const handleDecrement = useCallback(
    (cromo: AlbumCromo) => {
      dec.mutate(cromo.id, {
        onSuccess: () => {
          if (cromo.owned === 1) {
            toast.show('Cromo eliminado del álbum.', 'info');
          }
        },
        onError: (err) => {
          toast.show(err instanceof Error ? err.message : 'No se pudo quitar.', 'danger');
        },
      });
    },
    [dec, toast],
  );

  const handleRefresh = useCallback(async () => {
    try {
      const n = await pullRemoteInventory();
      void qc.invalidateQueries({ queryKey: albumQueryKey });
      if (n > 0) toast.show(`Sincronizado: ${n} cromos`, 'success');
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'No se pudo sincronizar.', 'warning');
    }
  }, [qc, toast]);

  const items = useMemo(() => flattenSections(sections), [sections]);

  const renderItem: ListRenderItem<ListItem> = useCallback(
    ({ item }) => {
      if (item.type === 'header') {
        return <CountryHeader section={item.section} />;
      }
      return (
        <CromoRow
          country={item.country}
          cromos={item.cromos}
          cardWidth={cardWidth}
          onPress={handlePressCromo}
          onLongPress={handleLongPress}
          onDecrement={handleDecrement}
        />
      );
    },
    [cardWidth, handlePressCromo, handleLongPress, handleDecrement],
  );

  const getItemType = useCallback((item: ListItem) => item.type, []);
  const keyExtractor = useCallback((item: ListItem) => item.key, []);

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        eyebrow="Mundial 2026"
        title="El álbum"
        rightSlot={
          <View className="flex-row items-center gap-2">
            <Button label="+ Sobre" size="sm" onPress={() => sobreSheetRef.current?.present()} />
          </View>
        }
      />

      <View className="pb-2">
        <SearchBar value={search} onChange={setSearch} />
      </View>

      <View className="pb-3">
        <FilterTabs current={tab} stats={stats} onChange={setTab} />
      </View>
      <View className="pb-2">
        <CountryChips
          countries={countries}
          selected={selectedCountries}
          onToggle={toggleCountry}
          onClear={clearCountries}
        />
      </View>

      {items.length === 0 ? (
        <EmptyStateView
          isLoading={isLoading}
          isSearching={isSearching}
          query={search}
          onClear={() => {
            setTab('all');
            clearCountries();
            clearSearch();
          }}
        />
      ) : (
        <FlashList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          contentContainerStyle={{
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: 8,
            paddingBottom: 40,
          }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
          }
          drawDistance={500}
        />
      )}

      <CromoSheet ref={cromoSheetRef} />
      <SobreSheet ref={sobreSheetRef} />
    </Screen>
  );
}

function EmptyStateView({
  isLoading,
  isSearching,
  query,
  onClear,
}: {
  isLoading: boolean;
  isSearching: boolean;
  query: string;
  onClear: () => void;
}) {
  return (
    <View className="flex-1 items-center pt-16 px-6">
      <Text className="text-text-secondary text-center font-sans">
        {isLoading
          ? 'Cargando tu álbum…'
          : isSearching
            ? `No encontramos cromos para "${query.trim()}".`
            : 'Nada para mostrar con los filtros actuales.'}
      </Text>
      {!isLoading && (
        <Pressable
          onPress={onClear}
          className="mt-3 rounded-pill bg-surface px-4 py-2"
        >
          <Text className="text-sm font-sans-semibold text-text-primary">
            Limpiar filtros
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/** Header de sección — sirve tanto para países como para FWC/MUSEUM/COCA/EXTRA. */
const CountryHeader = ({ section }: { section: CountrySectionData }) => {
  const { country, haveCount, totalCount } = section;
  const pct = totalCount === 0 ? 0 : haveCount / totalCount;
  const hint = SPECIAL_SECTION_HINTS[country.code];
  const subtitleLeft = country.group_code
    ? `Grupo ${country.group_code}`
    : (hint ?? country.code);
  return (
    <View
      style={{
        height: HEADER_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View className="flex-row items-center gap-3">
        <SectionMark country={country} size="md" />
        <View>
          <Text className="text-[15px] font-sans-bold text-text-primary">
            {country.name}
          </Text>
          <Text className="text-[11px] font-sans-medium text-text-tertiary mt-0.5">
            {subtitleLeft} · {haveCount}/{totalCount}
          </Text>
        </View>
      </View>
      <View style={{ width: 90 }}>
        <ProgressBar value={pct} height={4} />
      </View>
    </View>
  );
};

/** Una fila con N cromos. Memoizada por país+ids+cardWidth. */
const CromoRow = ({
  country,
  cromos,
  cardWidth,
  onPress,
  onLongPress,
  onDecrement,
}: {
  country: CountryMeta;
  cromos: AlbumCromo[];
  cardWidth: number;
  onPress: (cromo: AlbumCromo) => void;
  onLongPress: (cromo: AlbumCromo) => void;
  onDecrement: (cromo: AlbumCromo) => void;
}) => {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: CARD_GAP,
        marginBottom: ROW_VERTICAL_GAP,
      }}
    >
      {cromos.map((cromo) => (
        <View key={cromo.id} style={{ width: cardWidth }}>
          <CromoCard
            cromo={cromo}
            country={country}
            onPress={onPress}
            onLongPress={onLongPress}
            onDecrement={onDecrement}
          />
        </View>
      ))}
      {/* Spacers para que la última fila no tenga cromos "estirados" */}
      {Array.from({ length: COLS - cromos.length }).map((_, i) => (
        <View key={`spacer-${i}`} style={{ width: cardWidth }} />
      ))}
    </View>
  );
};

// Para que TS no se queje de styles unused — usado por CromoRow via cardWidth dinámico.
StyleSheet.create({});
