/**
 * AlbumScreen — virtualized rebuild, faithful to Claude Design v3 (screens-main.jsx).
 *
 * Architecture:
 *   <Screen>
 *     <SectionList>
 *       ListHeader = TopBar + GuestBanner + Filter pills + Country chips
 *       Section    = one country (header = SectionHeader)
 *       Item       = one ROW of N cards (each card wrapped in flex:1 cell)
 *     </SectionList>
 *     <BottomSheet> on cromo tap → CromoDetailSheet with +/-
 *
 * Why SectionList instead of ScrollView+Grid:
 *   - 240 cromos × Pressable + SVG = hundreds of native views.
 *     ScrollView renders them ALL upfront, locking up the main thread on
 *     scroll. SectionList virtualizes by ROW — only ~10 rows live in the
 *     viewport at any time, the rest are unmounted/clipped.
 *   - Row is `memo`'d on its inputs (row data, cols, size). Filters that
 *     don't change the row don't re-render it.
 *
 * Grid model (unchanged): row = `flexDirection:row` + `gap`, each cell is
 *   `<View flex:1>` wrapping a `<CromoCard />` (width:100% + aspectRatio).
 *   Yoga handles sub-pixel math so the last card lands flush with the right
 *   padding — no dead space, perfectly symmetric on any device.
 */
import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  SectionList,
  type SectionListRenderItemInfo,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Screen, RegisterPrompt } from '@/components';
import CromoCard from '@/components/CromoCard';
import SectionHeader from '@/components/SectionHeader';
import BottomSheet from '@/components/BottomSheet';
import CromoDetailSheet from '@/components/CromoDetailSheet';
import { C } from '@/theme';
import { useAlbum } from '@/lib/album-queries';
import { useAlbumFilters, applyFilters } from '@/lib/album-filters';
import { useSession } from '@/lib/session-context';
import type { AlbumCromo, AlbumSection } from '@/lib/album-types';
import type { FilterState } from '@/lib/album-filters';

const FONT_MANROPE_X = 'Manrope_800ExtraBold';
const FONT_MANROPE = 'Manrope_700Bold';
const FONT_MONO = 'JetBrainsMono_400Regular';

type StatusFilter = FilterState['status'];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'missing', label: 'Faltan' },
  { value: 'repeated', label: 'Repetidos' },
  { value: 'have', label: 'Tengo' },
];

// ─── Filter pill ─────────────────────────────────────────────────────────────
const FilterPill = memo(function FilterPill({
  label,
  count,
  selected,
  onPress,
}: {
  label: string;
  count: number;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${count}`}
      accessibilityState={{ selected }}
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
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      <Text
        style={{
          fontFamily: FONT_MANROPE,
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
          fontFamily: FONT_MONO,
          fontSize: 11,
          fontWeight: '700',
          color: selected ? 'rgba(255,255,255,0.7)' : '#7A766B',
        }}
      >
        {count}
      </Text>
    </Pressable>
  );
});

// ─── Country chip ────────────────────────────────────────────────────────────
const CountryChip = memo(function CountryChip({
  flag,
  code,
  selected,
  onPress,
}: {
  flag: string;
  code: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={code}
      accessibilityState={{ selected }}
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
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      <Text style={{ fontSize: 14, marginRight: 7 }}>{flag}</Text>
      <Text
        style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          fontWeight: '700',
          color: selected ? '#FFFFFF' : '#15140F',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}
      >
        {code}
      </Text>
    </Pressable>
  );
});

// ─── Row helpers ─────────────────────────────────────────────────────────────
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

type CromoRow = { id: string; cromos: AlbumCromo[] };

type AlbumSectionData = {
  key: string;
  country: AlbumSection['country'] | null; // null = flat view, no header
  ownedCount: number;
  total: number;
  data: CromoRow[];
};

// ─── Row: one row of N cards (memoized — SectionList virtualizes per row) ──
const Row = memo(function Row({
  row,
  cols,
  size,
  gap,
  rowGap,
  isLastRow,
  onCardPress,
}: {
  row: CromoRow;
  cols: number;
  size: 'sm' | 'md';
  gap: number;
  rowGap: number;
  isLastRow: boolean;
  onCardPress: (c: AlbumCromo) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap,
        paddingHorizontal: 20,
        marginBottom: isLastRow ? 6 : rowGap,
      }}
    >
      {row.cromos.map((cromo) => (
        <View key={cromo.id} style={{ flex: 1 }}>
          {/* onPress receives the cromo from CromoCard itself — passing a
              stable function reference keeps memo() effective. */}
          <CromoCard cromo={cromo} size={size} onPress={onCardPress} />
        </View>
      ))}
      {row.cromos.length < cols &&
        Array.from({ length: cols - row.cromos.length }).map((_, j) => (
          <View key={`sp-${j}`} style={{ flex: 1 }} />
        ))}
    </View>
  );
});

// ─── AlbumScreen ─────────────────────────────────────────────────────────────
export default function AlbumScreen() {
  const { isGuest } = useSession();
  const { sections, isLoading, isRefetching, refetch } = useAlbum();
  const { status, country, setStatus, setCountry } = useAlbumFilters();
  const [selected, setSelected] = useState<AlbumCromo | null>(null);

  const allCromos = useMemo(() => sections.flatMap((s) => s.cromos), [sections]);

  const filterCounts = useMemo(
    () => ({
      all: allCromos.length,
      missing: allCromos.filter((c) => c.status === 'missing').length,
      repeated: allCromos.filter((c) => c.status === 'repeated').length,
      have: allCromos.filter((c) => c.status === 'have' || c.status === 'repeated').length,
    }),
    [allCromos],
  );

  const filteredSections = useMemo(() => {
    return sections
      .map((s) => {
        const filtered = applyFilters(s.cromos, status, country);
        return {
          ...s,
          cromos: filtered,
          ownedCount: filtered.filter((c) => c.status !== 'missing').length,
        };
      })
      .filter((s) => (country === null ? true : s.country.code === country))
      .filter((s) => s.cromos.length > 0);
  }, [sections, status, country]);

  const flatCromos = useMemo(
    () => filteredSections.flatMap((s) => s.cromos),
    [filteredSections],
  );
  const totalVisible = flatCromos.length;

  const isDefaultView = status === 'all' && country === null;
  const cols = isDefaultView ? 4 : 3;
  const size: 'sm' | 'md' = isDefaultView ? 'sm' : 'md';
  const gap = size === 'sm' ? 10 : 12;
  const rowGap = size === 'sm' ? 12 : 14;

  // Build SectionList sections (rows chunked per N cols)
  const listSections = useMemo<AlbumSectionData[]>(() => {
    // Flat view: status filter active + country=null (NOT default).
    // Single pseudo-section with no header — all matched cromos in one grid.
    if (!isDefaultView && country === null) {
      return [
        {
          key: 'flat',
          country: null,
          ownedCount: 0,
          total: 0,
          data: chunk(flatCromos, cols).map((cromos, i) => ({
            id: `flat-${i}`,
            cromos,
          })),
        },
      ];
    }
    // Per-country sections (default view OR single country)
    return filteredSections.map((s) => ({
      key: s.country.code,
      country: s.country,
      ownedCount: s.ownedCount,
      total: s.total,
      data: chunk(s.cromos, cols).map((cromos, i) => ({
        id: `${s.country.code}-${i}`,
        cromos,
      })),
    }));
  }, [isDefaultView, country, filteredSections, flatCromos, cols]);

  const countryRow = useMemo(
    () => sections.map((s) => ({ code: s.country.code, flag: s.country.flag_emoji })),
    [sections],
  );

  const handlePress = useCallback((c: AlbumCromo) => setSelected(c), []);
  const handleClose = useCallback(() => setSelected(null), []);

  // ── SectionList callbacks (stable refs avoid full re-renders) ──
  const renderRow = useCallback(
    ({ item, index, section }: SectionListRenderItemInfo<CromoRow, AlbumSectionData>) => {
      const isLastRow = index === section.data.length - 1;
      return (
        <Row
          row={item}
          cols={cols}
          size={size}
          gap={gap}
          rowGap={rowGap}
          isLastRow={isLastRow}
          onCardPress={handlePress}
        />
      );
    },
    [cols, size, gap, rowGap, handlePress],
  );

  const renderHeader = useCallback(
    ({ section }: { section: AlbumSectionData }) => {
      if (!section.country) return null; // flat view: no header
      return (
        <SectionHeader
          flagEmoji={section.country.flag_emoji}
          countryCode={section.country.code}
          countryName={section.country.name}
          ownedCount={section.ownedCount}
          total={section.total}
          accent={section.country.accent}
        />
      );
    },
    [],
  );

  const renderSectionFooter = useCallback(() => <View style={{ height: 14 }} />, []);

  const keyExtractor = useCallback((item: CromoRow) => item.id, []);

  // ── ListHeader: title + guest banner + pills + chips ──
  const ListHeader = useCallback(
    () => (
      <View>
        {/* Top bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 16,
          }}
        >
          <View>
            <Text
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                color: C.muted,
                letterSpacing: 1.6,
              }}
            >
              MUNDIAL 2026
            </Text>
            <Text
              style={{
                fontFamily: FONT_MANROPE_X,
                fontSize: 32,
                fontWeight: '800',
                color: C.ink,
                letterSpacing: -1,
                lineHeight: 38,
              }}
            >
              El álbum
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buscar cromos"
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: C.hairline,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
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
          <View style={{ marginHorizontal: 20, marginBottom: 12 }}>
            <RegisterPrompt feature="intercambios" />
          </View>
        )}

        {/* Status filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 12 }}
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

        {/* Country chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 6, paddingBottom: 16 }}
        >
          <CountryChip
            flag="🌍"
            code="ALL"
            selected={country === null}
            onPress={() => setCountry(null)}
          />
          {countryRow.map(({ code, flag }) => (
            <CountryChip
              key={code}
              flag={flag}
              code={code}
              selected={country === code}
              onPress={() => setCountry(code)}
            />
          ))}
        </ScrollView>
      </View>
    ),
    [isGuest, status, country, filterCounts, countryRow, setStatus, setCountry],
  );

  // ── ListEmpty: no cromos match current filter ──
  const ListEmpty = useCallback(
    () => (
      <View style={{ paddingVertical: 48, alignItems: 'center', paddingHorizontal: 32 }}>
        <Text
          style={{
            fontFamily: FONT_MANROPE,
            fontSize: 14,
            color: C.muted,
            textAlign: 'center',
          }}
        >
          No hay cromos con ese filtro.
        </Text>
      </View>
    ),
    [],
  );

  if (isLoading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionList
        sections={totalVisible === 0 ? [] : listSections}
        keyExtractor={keyExtractor}
        renderItem={renderRow}
        renderSectionHeader={renderHeader}
        renderSectionFooter={renderSectionFooter}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={C.accent}
            colors={[C.accent]}
          />
        }
        // ── Virtualization tuning ──
        // Aggressive defaults — render less upfront, less in window, no
        // clipped subviews (Android RN layout bug at high item counts).
        initialNumToRender={6}
        maxToRenderPerBatch={4}
        updateCellsBatchingPeriod={50}
        windowSize={3}
      />

      {/* Detail sheet on tap */}
      <BottomSheet visible={selected !== null} onClose={handleClose}>
        {selected && <CromoDetailSheet cromo={selected} onClose={handleClose} />}
      </BottomSheet>
    </Screen>
  );
}
