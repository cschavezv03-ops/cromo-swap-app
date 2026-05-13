/**
 * AlbumScreen — the main album view.
 * SectionList with 16 country sections; each section renders a 15-cromo flex-wrap grid.
 *
 * ui-ux-pro-max guidance applied:
 * - SectionList (virtualize-lists rule) with stickySectionHeadersEnabled
 * - One fat item per section renders the 15-card grid (avoids numColumns + sticky conflict)
 * - Filter chips: pill shape, ink/paper2 selected/idle, accessibilityRole + accessibilityState
 * - Progress ring lg with % label in header
 * - Stats in JetBrains Mono (number-tabular rule)
 * - ActivityIndicator color C.accent for loading state
 * - Empty state: centered helpful text (empty-states rule)
 * - RefreshControl tintColor = C.accent
 * - Guest banner: RegisterPrompt below title (content-priority)
 * - All colors from C — no hex literals
 *
 * Spec: R4-1-1..R4-1-8, R4-NFR-3, R4-NFR-11
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Screen, RegisterPrompt } from '@/components';
import SectionHeader from '@/components/SectionHeader';
import CromoCard from '@/components/CromoCard';
import ProgressRing from '@/components/ProgressRing';
import BottomSheet from '@/components/BottomSheet';
import CromoDetailSheet from '@/components/CromoDetailSheet';
import { C, spacing, radii, FONTS } from '@/theme';
import { useAlbum } from '@/lib/album-queries';
import { useAlbumFilters, applyFilters } from '@/lib/album-filters';
import { useSession } from '@/lib/session-context';
import type { AlbumCromo, AlbumSection } from '@/lib/album-types';
import type { FilterState } from '@/lib/album-filters';

// ── Filter chip rows ──────────────────────────────────────────────────────────

type StatusFilter = FilterState['status'];

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function FilterChip({ label, selected, onPress }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ── Album header (ListHeaderComponent) ───────────────────────────────────────

interface AlbumHeaderProps {
  isGuest: boolean;
  owned: number;
  repeated: number;
  missing: number;
  pct: number;
  status: FilterState['status'];
  country: string | null;
  countryCodes: string[];
  onSetStatus: (s: FilterState['status']) => void;
  onSetCountry: (c: string | null) => void;
}

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'missing', label: 'Faltan' },
  { value: 'have', label: 'Tengo' },
  { value: 'repeated', label: 'Repetidos' },
];

function AlbumHeader({
  isGuest,
  owned,
  repeated,
  missing,
  pct,
  status,
  country,
  countryCodes,
  onSetStatus,
  onSetCountry,
}: AlbumHeaderProps) {
  return (
    <View style={styles.header}>
      {/* Title */}
      <Text style={styles.title}>Tu álbum</Text>

      {/* Guest banner — below title, above stats */}
      {isGuest && (
        <View style={styles.guestBanner}>
          <RegisterPrompt feature="intercambios" />
        </View>
      )}

      {/* Global progress ring + stats */}
      <View style={styles.statsContainer}>
        <ProgressRing size="lg" pct={pct} label />
        <View style={styles.statsList}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{owned}</Text>
            <Text style={styles.statLabel}>Tengo</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{repeated}</Text>
            <Text style={styles.statLabel}>Repetidos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{missing}</Text>
            <Text style={styles.statLabel}>Faltan</Text>
          </View>
        </View>
      </View>

      {/* Status filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
        accessibilityLabel="Filtrar por estado"
      >
        {STATUS_FILTERS.map((f) => (
          <FilterChip
            key={f.value}
            label={f.label}
            selected={status === f.value}
            onPress={() => onSetStatus(f.value)}
          />
        ))}
      </ScrollView>

      {/* Country filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
        accessibilityLabel="Filtrar por país"
      >
        <FilterChip
          label="Todos"
          selected={country === null}
          onPress={() => onSetCountry(null)}
        />
        {countryCodes.map((code) => (
          <FilterChip
            key={code}
            label={code}
            selected={country === code}
            onPress={() => onSetCountry(code)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ── Section grid (rendered inside the single section item) ───────────────────

interface SectionGridProps {
  cromos: AlbumCromo[];
  onCardPress: (cromo: AlbumCromo) => void;
}

const SectionGrid = React.memo(function SectionGrid({
  cromos,
  onCardPress,
}: SectionGridProps) {
  return (
    <View style={styles.grid}>
      {cromos.map((cromo) => (
        <View key={cromo.id} style={styles.gridCell}>
          <CromoCard
            cromo={cromo}
            size="sm"
            onPress={() => onCardPress(cromo)}
          />
        </View>
      ))}
    </View>
  );
});

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No hay cromos con ese filtro.</Text>
    </View>
  );
}

// ── AlbumScreen ───────────────────────────────────────────────────────────────

export default function AlbumScreen() {
  const { isGuest } = useSession();
  const { sections, stats, isLoading, isRefetching, refetch } = useAlbum();
  const { status, country, setStatus, setCountry } = useAlbumFilters();
  const [selectedCromo, setSelectedCromo] = useState<AlbumCromo | null>(null);

  // Apply filters to sections
  const filteredSections = useMemo<
    { title: string; data: [AlbumSection]; section: AlbumSection }[]
  >(() => {
    return sections
      .map((section) => {
        const filteredCromos = applyFilters(section.cromos, status, country);
        return {
          title: section.country.code,
          // SectionList data must be an array; we use one fat item per section
          data: [{ ...section, cromos: filteredCromos }] as [AlbumSection],
          section: { ...section, cromos: filteredCromos },
        };
      })
      .filter((s) => {
        // When a country filter is active, hide other countries entirely
        if (country !== null && s.title !== country) return false;
        return true; // status-only filter shows empty sections (handled by EmptyState)
      });
  }, [sections, status, country]);

  // Flatten all visible cromos to check empty
  const totalVisible = filteredSections.reduce(
    (sum, s) => sum + s.section.cromos.length,
    0
  );

  // Collect sorted country codes for the filter row
  const countryCodes = useMemo(
    () => sections.map((s) => s.country.code),
    [sections]
  );

  const handleCardPress = useCallback((cromo: AlbumCromo) => {
    setSelectedCromo(cromo);
  }, []);

  const handleSheetClose = useCallback(() => {
    setSelectedCromo(null);
  }, []);

  // Show loading spinner on initial load only
  if (isLoading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionList
        sections={filteredSections}
        stickySectionHeadersEnabled
        keyExtractor={(item) => item.country.code}
        renderSectionHeader={({ section }) => (
          <SectionHeader
            flagEmoji={section.section.country.flag_emoji}
            countryCode={section.section.country.code}
            countryName={section.section.country.name}
            ownedCount={section.section.ownedCount}
            total={section.section.total}
          />
        )}
        renderItem={({ item }) => (
          <SectionGrid
            cromos={item.cromos}
            onCardPress={handleCardPress}
          />
        )}
        ListHeaderComponent={
          <AlbumHeader
            isGuest={isGuest}
            owned={stats.owned}
            repeated={stats.repeated}
            missing={stats.missing}
            pct={stats.pct}
            status={status}
            country={country}
            countryCodes={countryCodes}
            onSetStatus={setStatus}
            onSetCountry={setCountry}
          />
        }
        ListEmptyComponent={totalVisible === 0 ? <EmptyState /> : null}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={C.accent}
            colors={[C.accent]}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Detail sheet */}
      <BottomSheet
        visible={selectedCromo !== null}
        onClose={handleSheetClose}
      >
        {selectedCromo && (
          <CromoDetailSheet cromo={selectedCromo} onClose={handleSheetClose} />
        )}
      </BottomSheet>
    </Screen>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // List
  listContent: {
    paddingBottom: spacing[8],
  },

  // Header
  header: {
    paddingBottom: spacing[3],
  },
  title: {
    fontFamily: FONTS.manropeExtraBold,
    fontSize: 28,
    color: C.ink,
    letterSpacing: -0.6,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    marginBottom: spacing[3],
  },
  guestBanner: {
    minHeight: 80,
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[4],
    gap: spacing[6],
  },
  statsList: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FONTS.mono,
    fontSize: 22,
    color: C.ink,
    lineHeight: 28,
  },
  statLabel: {
    fontFamily: FONTS.manrope,
    fontSize: 11,
    color: C.muted,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: C.hairline,
  },

  // Filter chips
  chipScroll: {
    marginBottom: spacing[2],
  },
  chipRow: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    borderRadius: radii.full,
    backgroundColor: C.paper2,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1] + 2, // 10px vertical
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: C.ink,
  },
  chipPressed: {
    opacity: 0.75,
  },
  chipText: {
    fontFamily: FONTS.manropeSemiBold,
    fontSize: 12,
    color: C.ink2,
  },
  chipTextSelected: {
    color: C.card,
  },

  // Section grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  gridCell: {
    // CromoCard sm is 72×100; gap handles spacing
  },

  // Empty state
  emptyState: {
    paddingVertical: spacing[12],
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  emptyText: {
    fontFamily: FONTS.manrope,
    fontSize: 15,
    color: C.muted,
    textAlign: 'center',
  },
});
