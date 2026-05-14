/**
 * CromoCard — sticker card, faithful to Claude Design v3 (components.jsx).
 *
 * Sizing model:
 *   - Default (no `width` prop): the card fills 100% of its parent column
 *     and uses `aspectRatio` for height. Wrap each card in a
 *     `<View style={{ flex: 1 }}>` row cell to get a perfect N-column grid.
 *     This is the React Native equivalent of `grid-template-columns: repeat(N, 1fr)`
 *     — Yoga calculates the exact pixel width gap-aware and sub-pixel-safe.
 *   - With explicit `width` prop: renders at that fixed pixel width and a
 *     proportional height. Used for hero/detail-sheet placement (e.g. 140pt).
 *
 * Two sizes:
 *   - 'sm' (4-col grid): aspect 72/100
 *   - 'md' (3-col grid / hero): aspect 92/128
 *
 * States:
 *   - missing: outer Pressable owns size + touch + press transform; INNER
 *     `<View>` owns the visible card surface (border + bg + radius +
 *     overflow:hidden). This wrapper pattern is the community-recommended
 *     workaround for Android RN New Architecture (SDK 55+) border bugs —
 *     borders + borderRadius on a Pressable are unreliable (RN issues
 *     #17432, #47905, #49606, #52415). Integer `borderWidth` (≥2) renders
 *     more reliably than sub-pixel (1.5).
 *   - have: top 2-color stripe, header (num+flag), portrait area with
 *     diagonal stripes + big jersey number, bottom name strip.
 *   - repeated: like have + dark ×N pill top-right.
 *   - legendario: dark bg + gold accents + gold corner dot.
 */
import React, { memo } from 'react';
import { Pressable, View, Text, StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { C } from '@/theme';
import type { AlbumCromo } from '@/lib/album-types';

const FONT_MANROPE = 'Manrope_700Bold';
const FONT_MANROPE_X = 'Manrope_800ExtraBold';
const FONT_MONO = 'JetBrainsMono_400Regular';

const LEGEND_BG = '#1F1B14';
const LEGEND_TEXT = '#F2E8C9';
const LEGEND_GOLD = '#FFD46B';
// Missing-slot fill: between the lightest gradient stop (#FEFDF7) and the
// middle (#FAF6EA). Slightly distinguishable from the page so the slot
// reads as a card, but warm enough to feel like "empty paper."
const MISSING_FILL = '#F6F2E2';

type Size = 'sm' | 'md';

interface CromoCardProps {
  cromo: AlbumCromo;
  size?: Size;
  /**
   * Receives the card's own cromo so the parent can pass a STABLE function
   * reference (e.g. `onPress={handleCardPress}`) without per-card closures.
   * Per-card closures break `memo` — every parent render recreates the
   * `onPress` prop, forcing every CromoCard to re-render even though its
   * data didn't change.
   */
  onPress?: (cromo: AlbumCromo) => void;
  /**
   * Optional fixed pixel width. If omitted, the card fills 100% of its parent
   * column and derives height via aspectRatio — wrap it in a `flex:1` cell to
   * build a symmetric grid. Pass an explicit width only for hero/detail use.
   */
  width?: number;
}

/**
 * Each card size defines its TYPOGRAPHIC scale. Card width is from the parent
 * (flex:1), height comes from aspectRatio.
 */
const TYPO: Record<
  Size,
  {
    stripeH: number;        // top stripe band height
    numFont: number;        // top-left index number
    flagFont: number;       // flag emoji size
    jerseyFont: number;     // big background jersey number
    nameFont: number;       // bottom player name
    namePad: number;        // bottom strip vertical padding
    aspect: number;         // width / height
  }
> = {
  sm: { stripeH: 8,  numFont: 10, flagFont: 16, jerseyFont: 26, nameFont: 9,  namePad: 5, aspect: 72 / 100 },
  md: { stripeH: 10, numFont: 12, flagFont: 22, jerseyFont: 32, nameFont: 11, namePad: 6, aspect: 92 / 128 },
};

function CromoCardInner({ cromo, size = 'sm', onPress, width }: CromoCardProps) {
  const t = TYPO[size];
  // Wrap `onPress(cromo)` ONCE per card lifetime via the cromo reference.
  // The cromo prop is stable per row item, so the handler stays stable too.
  const handlePress = React.useMemo(
    () => (onPress ? () => onPress(cromo) : undefined),
    [onPress, cromo],
  );
  // Sizing strategy:
  //   - Explicit width → fixed pixel size + computed height (hero use).
  //   - No width → fill the parent flex cell + aspectRatio for height (grid).
  // Yoga handles sub-pixel math when we let it: 4 × `flex:1` cells inside a
  // row with `gap` ALWAYS sum to exactly the available width.
  const sizingStyle: ViewStyle =
    width != null
      ? { width, height: Math.round(width / t.aspect) }
      : { width: '100%', aspectRatio: t.aspect };
  const isLegend = cromo.rarity_id === 'legendario';
  const isMissing = cromo.status === 'missing';
  const isRepeated = cromo.status === 'repeated';

  const numStr = String(cromo.n).padStart(3, '0');
  const jerseyStr = cromo.jersey != null ? String(cromo.jersey).padStart(2, '0') : '--';

  const a11yLabel = `Cromo ${cromo.n} ${cromo.country_name}, ${
    isMissing ? 'falta' : isRepeated ? `repetido ×${cromo.quantity}` : 'tengo'
  }`;

  // ────── MISSING ──────
  // Empty album slot: transparent fill + solid faint outline + centered
  // 3-digit number. Same outer dimensions as a HAVE card so the grid stays
  // perfectly symmetric whether the user has 0 cromos or 240.
  if (isMissing) {
    // Outer Pressable owns sizing (`sizingStyle`: width:100% + aspectRatio)
    // and touch. Inner View overlays the Pressable via `absoluteFill` and
    // paints the visible card surface (border + radius + bg).
    // Why absoluteFill and not flex:1: a flex:1 child with aspectRatio on
    // the parent confuses Yoga — the parent ends up collapsing to the
    // child's intrinsic height (effectively a horizontal pill). absoluteFill
    // takes the inner view OUT of the layout flow, so the Pressable's
    // aspectRatio-derived height is preserved.
    return (
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        style={({ pressed }) => [
          sizingStyle,
          pressed && { opacity: 0.55, transform: [{ scale: 0.97 }] },
        ]}
      >
        <View style={[StyleSheet.absoluteFill, styles.missingSurface]}>
          <Text style={[styles.missingNum, { fontSize: t.numFont + 2 }]}>{numStr}</Text>
        </View>
      </Pressable>
    );
  }

  // ────── HAVE / REPEATED / LEGENDARIO ──────
  const cardBg = isLegend ? LEGEND_BG : '#FFFFFF';
  const indexColor = isLegend ? 'rgba(242,232,201,0.65)' : C.muted;
  const nameColor = isLegend ? LEGEND_TEXT : C.ink;
  const jerseyColor = isLegend ? LEGEND_GOLD : cromo.accent || C.accent;
  const accent = cromo.accent || C.accent;

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={({ pressed }) => [
        styles.cardRoot,
        sizingStyle,
        {
          backgroundColor: cardBg,
          borderWidth: 0.5,
          borderColor: isLegend ? 'rgba(242,232,201,0.2)' : C.hairline,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 3,
          elevation: 1,
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      {/* 1) Top 2-color stripe band */}
      <View style={{ height: t.stripeH, flexDirection: 'row' }}>
        <View style={{ flex: 1, backgroundColor: cromo.stripe }} />
        <View style={{ flex: 1, backgroundColor: cromo.stripe2 }} />
      </View>

      {/* 2) Header row: index number (left) + flag (right) */}
      <View style={styles.headerRow}>
        <Text style={[styles.indexNum, { fontSize: t.numFont, color: indexColor }]}>
          {numStr}
        </Text>
        <Text style={{ fontSize: t.flagFont, lineHeight: t.flagFont + 2 }}>
          {cromo.flag_emoji}
        </Text>
      </View>

      {/* 3) Portrait area: diagonal stripes background + BIG jersey number */}
      <View
        style={[
          styles.portrait,
          { backgroundColor: isLegend ? 'rgba(255,212,107,0.08)' : `${accent}11` },
        ]}
      >
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          {/* Diagonal stripe pattern: 13 lines at 45° (halved from 26 for
              scroll perf — the pattern reads the same at typical card sizes). */}
          {Array.from({ length: 13 }).map((_, i) => {
            const offset = i * 14 - 60;
            return (
              <Line
                key={i}
                x1={offset}
                y1={0}
                x2={offset + 200}
                y2={200}
                stroke={isLegend ? LEGEND_GOLD : accent}
                strokeWidth={1.2}
                strokeOpacity={isLegend ? 0.18 : 0.16}
              />
            );
          })}
        </Svg>
        <Text
          style={{
            fontFamily: FONT_MONO,
            fontSize: t.jerseyFont,
            fontWeight: '700',
            color: jerseyColor,
            opacity: isLegend ? 1 : 0.5,
            letterSpacing: -1.5,
          }}
        >
          {jerseyStr}
        </Text>
      </View>

      {/* 4) Bottom name strip */}
      <View
        style={[
          styles.nameStrip,
          {
            paddingVertical: t.namePad,
            borderTopColor: isLegend ? 'rgba(242,232,201,0.15)' : C.hairline,
            backgroundColor: isLegend ? LEGEND_BG : '#FFFFFF',
          },
        ]}
      >
        <Text
          style={{
            fontFamily: FONT_MANROPE,
            fontSize: t.nameFont,
            fontWeight: '700',
            color: nameColor,
            letterSpacing: -0.2,
          }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {cromo.player_name}
        </Text>
      </View>

      {/* Legendario gold corner dot */}
      {isLegend && (
        <View style={styles.legendDot} />
      )}

      {/* Repeated ×N pill */}
      {isRepeated && (
        <View style={styles.repeatedPill}>
          <Text style={styles.repeatedText}>×{cromo.quantity}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default memo(CromoCardInner);

const styles = StyleSheet.create({
  cardRoot: {
    borderRadius: 8,
    position: 'relative',
  },
  missingSurface: {
    backgroundColor: MISSING_FILL,
    borderWidth: 2, // integer ≥ 2 for reliable Android render
    borderColor: C.faint,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingNum: {
    fontFamily: FONT_MONO,
    color: C.faint,
    letterSpacing: -0.3,
    fontWeight: '500',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 7,
    paddingTop: 5,
  },
  indexNum: {
    fontFamily: FONT_MONO,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  portrait: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    marginTop: 1,
    marginBottom: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  nameStrip: {
    paddingHorizontal: 7,
    borderTopWidth: 0.5,
  },
  legendDot: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: LEGEND_GOLD,
    shadowColor: LEGEND_GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 3,
  },
  repeatedPill: {
    position: 'absolute',
    top: 5,
    right: 5,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatedText: {
    fontFamily: FONT_MONO,
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export type { CromoCardProps };
