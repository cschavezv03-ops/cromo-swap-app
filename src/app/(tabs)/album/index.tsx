/**
 * AlbumScreen — full rebuild, faithful to Claude Design v3 (screens-main.jsx).
 *
 * Architecture:
 *   <Screen>
 *     <ScrollView>
 *       <TopBar>            MUNDIAL 2026 / El álbum + search icon
 *       <PillRow>           Todos N / Faltan N / Repetidos N / Tengo N
 *       <CountryRow>        🌍 ALL · ARG · BRA · ... (horizontal scroll)
 *       <PerCountrySection> SectionHeader + 4-col grid (flex:1 per column)
 *     </ScrollView>
 *     <BottomSheet>         on cromo tap → CromoDetailSheet with +/-
 *
 * Grid implementation: explicit row chunking with `flex: 1` per cell — this is
 * the React Native equivalent of CSS `grid-template-columns: repeat(4, 1fr)`.
 * Cards inside use `width: 100% + aspectRatio` so they scale exactly to
 * 1/N of the available row width on ANY screen.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
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
function FilterPill({
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
}

// ─── Country chip ────────────────────────────────────────────────────────────
function CountryChip({
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
}

// ─── Grid: explicit row chunking with flex:1 per cell ────────────────────────
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function Grid({
  cromos,
  cols,
  size,
  cardWidth,
  onCardPress,
}: {
  cromos: AlbumCromo[];
  cols: number;
  size: 'sm' | 'md';
  cardWidth: number;
  onCardPress: (c: AlbumCromo) => void;
}) {
  const rows = chunk(cromos, cols);
  const gap = size === 'sm' ? 10 : 12;
  const rowGap = size === 'sm' ? 12 : 14;

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
      {rows.map((row, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            gap,
            marginBottom: i < rows.length - 1 ? rowGap : 6,
          }}
        >
          {row.map((cromo) => (
            <CromoCard
              key={cromo.id}
              cromo={cromo}
              size={size}
              width={cardWidth}
              onPress={() => onCardPress(cromo)}
            />
          ))}
          {row.length < cols &&
            Array.from({ length: cols - row.length }).map((_, j) => (
              <View key={`sp-${j}`} style={{ width: cardWidth }} />
            ))}
        </View>
      ))}
    </View>
  );
}

// ─── Per-country section ─────────────────────────────────────────────────────
function PerCountrySection({
  section,
  cols,
  size,
  cardWidth,
  onCardPress,
}: {
  section: AlbumSection;
  cols: number;
  size: 'sm' | 'md';
  cardWidth: number;
  onCardPress: (c: AlbumCromo) => void;
}) {
  if (section.cromos.length === 0) return null;
  return (
    <View style={{ marginBottom: 18 }}>
      <SectionHeader
        flagEmoji={section.country.flag_emoji}
        countryCode={section.country.code}
        countryName={section.country.name}
        ownedCount={section.ownedCount}
        total={section.total}
        accent={section.country.accent}
      />
      <Grid
        cromos={section.cromos}
        cols={cols}
        size={size}
        cardWidth={cardWidth}
        onCardPress={onCardPress}
      />
    </View>
  );
}

// ─── AlbumScreen ─────────────────────────────────────────────────────────────
export default function AlbumScreen() {
  const { isGuest } = useSession();
  const { sections, stats, isLoading, isRefetching, refetch } = useAlbum();
  const { status, country, setStatus, setCountry } = useAlbumFilters();
  const [selected, setSelected] = useState<AlbumCromo | null>(null);

  // All cromos flat (for counts and filtered flat view)
  const allCromos = useMemo(() => sections.flatMap((s) => s.cromos), [sections]);

  const filterCounts = useMemo(() => {
    return {
      all: allCromos.length,
      missing: allCromos.filter((c) => c.status === 'missing').length,
      repeated: allCromos.filter((c) => c.status === 'repeated').length,
      have: allCromos.filter((c) => c.status === 'have' || c.status === 'repeated').length,
    };
  }, [allCromos]);

  // Filter the sections
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
      .filter((s) => (country === null ? true : s.country.code === country));
  }, [sections, status, country]);

  const flatCromos = useMemo(() => filteredSections.flatMap((s) => s.cromos), [filteredSections]);
  const totalVisible = flatCromos.length;

  const isDefaultView = status === 'all' && country === null;
  const cols = isDefaultView ? 4 : 3;
  const size: 'sm' | 'md' = isDefaultView ? 'sm' : 'md';

  // ── Compute card width from screen so all 4 (or 3) cards fit exactly ─
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = useMemo(() => {
    const horizPad = 20;
    const gap = size === 'sm' ? 10 : 12;
    return Math.floor((screenWidth - horizPad * 2 - gap * (cols - 1)) / cols);
  }, [screenWidth, cols, size]);

  const countryRow = useMemo(
    () => sections.map((s) => ({ code: s.country.code, flag: s.country.flag_emoji })),
    [sections],
  );

  const handlePress = useCallback((c: AlbumCromo) => setSelected(c), []);
  const handleClose = useCallback(() => setSelected(null), []);

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
      <ScrollView
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
      >
        {/* ── Top bar: title + search icon ───────────────────── */}
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

        {/* ── Guest banner (only for anon users) ───────────── */}
        {isGuest && (
          <View style={{ marginHorizontal: 20, marginBottom: 12 }}>
            <RegisterPrompt feature="intercambios" />
          </View>
        )}

        {/* ── Status filter pills ──────────────────────────── */}
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

        {/* ── Country chips ────────────────────────────────── */}
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

        {/* ── Grid area ────────────────────────────────────── */}
        {totalVisible === 0 ? (
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
        ) : isDefaultView ? (
          filteredSections.map((s) => (
            <PerCountrySection
              key={s.country.code}
              section={s}
              cols={cols}
              size={size}
              cardWidth={cardWidth}
              onCardPress={handlePress}
            />
          ))
        ) : country !== null ? (
          filteredSections.map((s) => (
            <PerCountrySection
              key={s.country.code}
              section={s}
              cols={cols}
              size={size}
              cardWidth={cardWidth}
              onCardPress={handlePress}
            />
          ))
        ) : (
          <Grid
            cromos={flatCromos}
            cols={cols}
            size={size}
            cardWidth={cardWidth}
            onCardPress={handlePress}
          />
        )}
      </ScrollView>

      {/* ── Detail sheet on tap ─────────────────────────────── */}
      <BottomSheet visible={selected !== null} onClose={handleClose}>
        {selected && <CromoDetailSheet cromo={selected} onClose={handleClose} />}
      </BottomSheet>
    </Screen>
  );
}
