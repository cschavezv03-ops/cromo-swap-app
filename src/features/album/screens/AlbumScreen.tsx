import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useProfile } from '@/features/auth/hooks/useProfile';
import { Button, Screen, ScreenHeader, useToast } from '@/ui';

import { CountryChips } from '../components/CountryChips';
import { CountrySection } from '../components/CountrySection';
import { CromoSheet, type CromoSheetHandle } from '../components/CromoSheet';
import { FilterTabs } from '../components/FilterTabs';
import { SobreSheet, type SobreSheetHandle } from '../components/SobreSheet';
import { loadAllCountries } from '../data/catalog';
import { pullRemoteInventory } from '../data/inventory';
import {
  albumQueryKey,
  useFilteredAlbum,
} from '../hooks/useAlbumData';
import {
  useFiltersHydration,
  useFiltersStore,
} from '../hooks/useFilters';
import { useIncrementOwned } from '../hooks/useInventoryMutation';
import type { AlbumCromo, CountryMeta } from '../lib/types';

const SCREEN_PADDING = 20;
const COLUMNS = 4;
const GAP = 8;

export function AlbumScreen() {
  const toast = useToast();
  useFiltersHydration();
  const tab = useFiltersStore((s) => s.tab);
  const selectedCountries = useFiltersStore((s) => s.selectedCountries);
  const setTab = useFiltersStore((s) => s.setTab);
  const toggleCountry = useFiltersStore((s) => s.toggleCountry);
  const clearCountries = useFiltersStore((s) => s.clearCountries);

  const { sections, stats, isLoading } = useFilteredAlbum();
  const { data: profile } = useProfile();
  const cromoSheetRef = useRef<CromoSheetHandle>(null);
  const sobreSheetRef = useRef<SobreSheetHandle>(null);
  const inc = useIncrementOwned();
  const qc = useQueryClient();

  // Countries list comes from local SQLite directly (does not depend on filters).
  const { data: countries = [] } = useQuery({
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

  // On first mount, try to pull remote inventory into local (best-effort).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const n = await pullRemoteInventory();
        if (!cancelled && n > 0) {
          void qc.invalidateQueries({ queryKey: albumQueryKey });
        }
      } catch {
        // offline / no session — fine
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [qc]);

  const cardWidth = useMemo(() => {
    const w = Dimensions.get('window').width - SCREEN_PADDING * 2 - GAP * (COLUMNS - 1);
    return Math.floor(w / COLUMNS);
  }, []);

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

  const handleLongPress = useCallback((cromo: AlbumCromo) => {
    const country = countries.find((c) => c.code === cromo.country_code) ?? null;
    cromoSheetRef.current?.present(cromo, country);
  }, [countries]);

  const handleRefresh = useCallback(async () => {
    try {
      const n = await pullRemoteInventory();
      void qc.invalidateQueries({ queryKey: albumQueryKey });
      if (n > 0) toast.show(`Sincronizado: ${n} cromos`, 'success');
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'No se pudo sincronizar.', 'warning');
    }
  }, [qc, toast]);

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

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingTop: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
      >
        {sections.length === 0 ? (
          <View className="mt-16 items-center">
            <Text className="text-text-secondary text-center font-sans">
              {isLoading
                ? 'Cargando tu álbum…'
                : 'Nada para mostrar con los filtros actuales.'}
            </Text>
            {!isLoading && (
              <Pressable
                onPress={() => {
                  setTab('all');
                  clearCountries();
                }}
                className="mt-3 rounded-pill bg-surface px-4 py-2"
              >
                <Text className="text-sm font-sans-semibold text-text-primary">
                  Limpiar filtros
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          sections.map((section) => (
            <CountrySection
              key={section.country.code}
              section={section}
              cardWidth={cardWidth}
              onPressCromo={handlePressCromo}
              onLongPressCromo={handleLongPress}
            />
          ))
        )}
      </ScrollView>

      <CromoSheet ref={cromoSheetRef} />
      <SobreSheet ref={sobreSheetRef} />
    </Screen>
  );
}
