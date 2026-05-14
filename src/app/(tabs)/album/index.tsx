/**
 * AlbumScreen — the main album view.
 * Faithfully recreates the Claude Design v2 reference (screens-main.jsx).
 *
 * Key architectural decision: SectionList → ScrollView
 * SectionList with flexWrap="wrap" inside renderItem causes layout collapse:
 * the list engine measures the item once and can't handle a multi-row flex-wrap
 * grid. For 240 cromos across 16 countries the ScrollView is perfectly fine;
 * virtualization can be added in Phase 10 if benchmarks demand it.
 *
 * Grid math:
 *   sm cards (72px) × 4 cols + gap (10px) × 3 = 318px → fits 360px+ with 20px
 *   horizontal padding each side (40px total → 318px < 320px ✓).
 *   md cards (92px) × 3 cols + gap (12px) × 2 = 300px → fits with same padding ✓.
 *
 * ui-ux-pro-max guidance applied:
 * - bottom-nav-limit: 5 tabs ✓
 * - virtualize-lists: skipped for 240 items per Phase 10 decision; noted
 * - progressive-loading: ActivityIndicator on initial load only
 * - empty-states: helpful text when filters return 0 results
 * - number-tabular: JetBrains Mono for all numeric stats
 * - touch-target-size: filter/country chips ≥36px height (pill height) ✓
 * - scroll-behavior: single root ScrollView, no nested scrolls for grids
 * - horizontal ScrollViews only for chip rows (one axis each)
 * - state-preservation: filter state kept in component via useAlbumFilters hook
 *
 * Spec: R4-1-1..R4-1-8, R4-NFR-3, R4-NFR-11
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Screen, RegisterPrompt } from '@/components';
import SectionHeader from '@/components/SectionHeader';
import CromoCard from '@/components/CromoCard';
import BottomSheet from '@/components/BottomSheet';
import CromoDetailSheet from '@/components/CromoDetailSheet';
import { C, spacing, radii, FONTS } from '@/theme';
import { useAlbum } from '@/lib/album-queries';
import { useAlbumFilters, applyFilters } from '@/lib/album-filters';
import { useSession } from '@/lib/session-context';
import type { AlbumCromo, AlbumSection } from '@/lib/album-types';
import type { FilterState } from '@/lib/album-filters';

// ── Types ─────────────────────────────────────────────────────────────────────
type StatusFilter = FilterState['status'];

// ── Status filter config ──────────────────────────────────────────────────────
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'missing', label: 'Faltan' },
  { value: 'repeated', label: 'Repetidos' },
  { value: 'have', label: 'Tengo' },
];

// ── Status filter pill ────────────────────────────────────────────────────────

interface FilterPillProps {
  label: string;
  count: number;
  selected: boolean;
  onPress: () => void;
}

function FilterPill({ label, count, selected, onPress }: FilterPillProps) {
  // Rock-solid inline styles — no callbacks, no StyleSheet, no theme indirection.
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: selected ? '#15140F' : '#FFFFFF',
        borderWidth: 1,
        borderColor: selected ? '#15140F' : '#E5E0D2',
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 10,
        minHeight: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      <Text
        style={{
          fontFamily: 'Manrope_700Bold',
          fontSize: 13,
          fontWeight: '700',
          color: selected ? '#FFFFFF' : '#15140F',
          letterSpacing: -0.1,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          marginLeft: 7,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 11,
          fontWeight: '700',
          color: selected ? 'rgba(255,255,255,0.65)' : '#7A766B',
        }}
      >
        {count}
      </Text>
    </Pressable>
  );
}

// ── Country chip ──────────────────────────────────────────────────────────────

interface CountryChipProps {
  flag: string;
  code: string;
  selected: boolean;
  onPress: () => void;
}

function CountryChip({ flag, code, selected, onPress }: CountryChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={code}
      accessibilityState={{ selected }}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: selected ? '#15140F' : '#FFFFFF',
        borderWidth: 1,
        borderColor: selected ? '#15140F' : '#E5E0D2',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        minHeight: 36,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      <Text style={{ fontSize: 16, marginRight: 7 }}>{flag}</Text>
      <Text
        style={{
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 11,
          fontWeight: '700',
          color: selected ? '#FFFFFF' : '#15140F',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}
      >
        {code}
      </Text>
    </Pressable>
  );
}

// ── Section grid (4-col for "all+all" view, 3-col for filtered view) ──────────
// Explicit row chunking — DO NOT use flexWrap. RN's flexWrap + per-child width
// reliably squishes children into one row on some Android configs. Manual rows
// of {flexDirection:'row'} with explicit child widths is bulletproof.

interface SectionGridProps {
  section: AlbumSection;
  onCardPress: (cromo: AlbumCromo) => void;
  compact: boolean;
  cardWidth: number;
  cardHeight: number;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const SectionGrid = React.memo(function SectionGrid({
  section,
  onCardPress,
  compact,
  cardWidth,
  cardHeight,
}: SectionGridProps) {
  const cardSize = compact ? 'sm' : 'md';
  const cols = compact ? 4 : 3;
  const gap = compact ? 10 : 12;
  const rowGap = compact ? 12 : 14;
  const rows = chunk(section.cromos, cols);

  return (
    <View style={styles.sectionBlock}>
      <SectionHeader
        flagEmoji={section.country.flag_emoji}
        countryCode={section.country.code}
        countryName={section.country.name}
        ownedCount={section.ownedCount}
        total={section.total}
        accent={section.country.accent}
      />

      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
        {rows.map((row, rowIdx) => (
          <View
            key={rowIdx}
            style={{
              flexDirection: 'row',
              gap,
              marginBottom: rowIdx < rows.length - 1 ? rowGap : 0,
            }}
          >
            {row.map((cromo) => (
              <CromoCard
                key={cromo.id}
                cromo={cromo}
                size={cardSize}
                width={cardWidth}
                height={cardHeight}
                onPress={() => onCardPress(cromo)}
              />
            ))}
            {/* Spacers to keep last row's cards left-aligned */}
            {row.length < cols &&
              Array.from({ length: cols - row.length }).map((_, i) => (
                <View key={`spacer-${i}`} style={{ width: cardWidth }} />
              ))}
          </View>
        ))}
      </View>
    </View>
  );
});

// ── Flat grid for filtered views ──────────────────────────────────────────────

interface FlatGridProps {
  cromos: AlbumCromo[];
  onCardPress: (cromo: AlbumCromo) => void;
  cardWidth: number;
  cardHeight: number;
}

function FlatGrid({ cromos, onCardPress, cardWidth, cardHeight }: FlatGridProps) {
  const cols = 3;
  const gap = 12;
  const rowGap = 14;
  const rows = chunk(cromos, cols);

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
      {rows.map((row, rowIdx) => (
        <View
          key={rowIdx}
          style={{
            flexDirection: 'row',
            gap,
            marginBottom: rowIdx < rows.length - 1 ? rowGap : 0,
          }}
        >
          {row.map((cromo) => (
            <CromoCard
              key={cromo.id}
              cromo={cromo}
              size="md"
              width={cardWidth}
              height={cardHeight}
              onPress={() => onCardPress(cromo)}
            />
          ))}
          {row.length < cols &&
            Array.from({ length: cols - row.length }).map((_, i) => (
              <View key={`spacer-${i}`} style={{ width: cardWidth }} />
            ))}
        </View>
      ))}
    </View>
  );
}

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

  // ── Card dimensions computed from screen — guarantees 4 (or 3) per row ───
  const { width: screenWidth } = useWindowDimensions();
  const cardSm = useMemo(() => {
    const cols = 4;
    const gap = 10;
    const horizPadding = 20;
    const w = Math.floor((screenWidth - horizPadding * 2 - gap * (cols - 1)) / cols);
    return { width: w, height: Math.round((w * 100) / 72) };
  }, [screenWidth]);
  const cardMd = useMemo(() => {
    const cols = 3;
    const gap = 12;
    const horizPadding = 20;
    const w = Math.floor((screenWidth - horizPadding * 2 - gap * (cols - 1)) / cols);
    return { width: w, height: Math.round((w * 128) / 92) };
  }, [screenWidth]);

  // ── Derived filter counts ─────────────────────────────────────────────────
  const allCromos = useMemo(
    () => sections.flatMap((s) => s.cromos),
    [sections]
  );
  const filterCounts = useMemo(() => {
    const total = allCromos.length;
    const missing = allCromos.filter((c) => c.status === 'missing').length;
    const repeated = allCromos.filter((c) => c.status === 'repeated').length;
    const have = allCromos.filter((c) => c.status === 'have').length;
    return { all: total, missing, repeated, have };
  }, [allCromos]);

  // ── Filtered sections / flat list ─────────────────────────────────────────
  const isDefaultView = status === 'all' && country === null;

  const filteredSections = useMemo<AlbumSection[]>(() => {
    return sections
      .map((section) => {
        const filteredCromos = applyFilters(section.cromos, status, country);
        return {
          ...section,
          cromos: filteredCromos,
          ownedCount: filteredCromos.filter((c) => c.status !== 'missing').length,
        };
      })
      .filter((s) => {
        if (country !== null && s.country.code !== country) return false;
        // When in default view: include all sections (even zero-cromo sections
        // are hidden because the grid renders nothing)
        return true;
      });
  }, [sections, status, country]);

  const flatCromos = useMemo<AlbumCromo[]>(() => {
    if (isDefaultView) return [];
    return filteredSections.flatMap((s) => s.cromos);
  }, [filteredSections, isDefaultView]);

  const totalVisible = isDefaultView
    ? filteredSections.reduce((sum, s) => sum + s.cromos.length, 0)
    : flatCromos.length;

  // ── Country codes for chip row ────────────────────────────────────────────
  const countryCodes = useMemo(
    () => sections.map((s) => ({ code: s.country.code, flag: s.country.flag_emoji })),
    [sections]
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCardPress = useCallback((cromo: AlbumCromo) => {
    setSelectedCromo(cromo);
  }, []);

  const handleSheetClose = useCallback(() => {
    setSelectedCromo(null);
  }, []);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      </Screen>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={C.accent}
            colors={[C.accent]}
          />
        }
      >
        {/* ── TopBar — matches design v2 (components.jsx → TopBar) ───
            Flex row: text column (subtitle + title) + IconBtn search on the right.
            subtitle: mono 10 / letterSpacing 1 / uppercase / muted.
            title: Manrope ExtraBold 26 / letterSpacing -0.6 / lineHeight 1.1. */}
        <View style={styles.topBar}>
          <View style={styles.topBarText}>
            <Text style={styles.heroSubtitle}>MUNDIAL 2026</Text>
            <Text style={styles.heroTitle}>El álbum</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buscar cromos"
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            style={({ pressed }) => [
              styles.iconBtn,
              pressed && styles.iconBtnPressed,
            ]}
          >
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M21 21l-4.3-4.3M16 10a6 6 0 11-12 0 6 6 0 0112 0z"
                stroke={C.ink}
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
          </Pressable>
        </View>

        {/* Guest banner */}
        {isGuest && (
          <View style={styles.guestBanner}>
            <RegisterPrompt feature="intercambios" />
          </View>
        )}

        {/* ── Status filter pills ─────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
          style={styles.pillScroll}
          accessibilityLabel="Filtrar por estado"
        >
          {STATUS_FILTERS.map((f) => (
            <FilterPill
              key={f.value}
              label={f.label}
              count={filterCounts[f.value] ?? 0}
              selected={status === f.value}
              onPress={() => setStatus(f.value)}
            />
          ))}
        </ScrollView>

        {/* ── Country chips ────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={styles.chipScroll}
          accessibilityLabel="Filtrar por país"
        >
          {/* All-countries reset */}
          <CountryChip
            flag="🌍"
            code="all"
            selected={country === null}
            onPress={() => setCountry(null)}
          />
          {countryCodes.map(({ code, flag }) => (
            <CountryChip
              key={code}
              flag={flag}
              code={code}
              selected={country === code}
              onPress={() => setCountry(code)}
            />
          ))}
        </ScrollView>

        {/* ── Card area ───────────────────────────────────── */}
        {totalVisible === 0 ? (
          <EmptyState />
        ) : isDefaultView ? (
          filteredSections.map((section) =>
            section.cromos.length > 0 ? (
              <SectionGrid
                key={section.country.code}
                section={section}
                onCardPress={handleCardPress}
                compact={true}
                cardWidth={cardSm.width}
                cardHeight={cardSm.height}
              />
            ) : null
          )
        ) : (
          <>
            {country !== null &&
              filteredSections.map((section) =>
                section.cromos.length > 0 ? (
                  <SectionGrid
                    key={section.country.code}
                    section={section}
                    onCardPress={handleCardPress}
                    compact={false}
                    cardWidth={cardMd.width}
                    cardHeight={cardMd.height}
                  />
                ) : null
              )}
            {country === null && (
              <FlatGrid
                cromos={flatCromos}
                onCardPress={handleCardPress}
                cardWidth={cardMd.width}
                cardHeight={cardMd.height}
              />
            )}
          </>
        )}
      </ScrollView>

      {/* ── Detail sheet ─────────────────────────────────── */}
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

  // Root scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing[12],
  },

  // TopBar — flex row, padding 14/20/12, gap 12 between text and right slot
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3], // 12 — matches design TopBar gap
    paddingHorizontal: spacing[5], // 20
    paddingTop: 14,
    paddingBottom: spacing[3], // 12
  },
  topBarText: {
    flex: 1,
    minWidth: 0,
  },
  heroSubtitle: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: FONTS.manropeExtraBold,
    fontSize: 26,
    color: C.ink,
    letterSpacing: -0.6,
    lineHeight: 29, // 26 * 1.1 per design
  },

  // IconBtn — circular paper2 button, 40×40, matches components.jsx IconBtn tone="paper"
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: C.paper2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconBtnPressed: {
    opacity: 0.75,
  },

  // Guest banner
  guestBanner: {
    marginHorizontal: spacing[5],
    marginBottom: spacing[3],
    minHeight: 60,
  },

  // Status filter pills
  pillScroll: {
    marginBottom: spacing[2],
  },
  pillRow: {
    paddingHorizontal: spacing[5],
    gap: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.full,
    minHeight: 40,
    // Subtle shadow so the white pills pop against the warm paper bg
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  pillIdle: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.hairline,
  },
  pillSelected: {
    backgroundColor: C.ink,
    borderWidth: 0,
  },
  pillPressed: {
    opacity: 0.78,
  },
  pillLabel: {
    fontFamily: FONTS.manropeBold,
    fontSize: 13,
    letterSpacing: -0.1,
    color: C.ink,
  },
  pillLabelSelected: {
    color: '#FFFFFF',
  },
  pillCount: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    fontWeight: '700',
    color: C.muted,
  },
  pillCountSelected: {
    color: '#FFFFFF',
    opacity: 0.7,
  },

  // Country chips
  chipScroll: {
    marginBottom: spacing[3],
  },
  chipRow: {
    paddingHorizontal: spacing[5],
    gap: spacing[1] + 2, // 6px
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
    minHeight: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  countryChipIdle: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.hairline,
  },
  countryChipSelected: {
    backgroundColor: C.ink,
    borderWidth: 0,
  },
  countryChipFlag: {
    fontSize: 16,
    fontFamily: 'System',
  },
  countryChipCode: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: C.ink,
    textTransform: 'uppercase',
  },
  countryChipCodeSelected: {
    color: '#FFFFFF',
  },

  // Section blocks
  sectionBlock: {
    marginBottom: spacing[6],
  },

  // Grid containers
  // SectionList → ScrollView: now just flexWrap on the outer container.
  // The parent ScrollView measures this correctly (unlike SectionList renderItem).
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[5], // 20px each side = 40px total
  },
  grid4col: {
    // 4 × 72px cards + 3 × 10px gaps = 318px → fits 360px wide phone ✓
    columnGap: 10,
    rowGap: 12,
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
  },
  grid3col: {
    columnGap: 12,
    rowGap: 14,
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
  },
  flatGridPadding: {
    paddingTop: spacing[2],
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
