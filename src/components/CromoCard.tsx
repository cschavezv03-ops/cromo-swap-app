/**
 * CromoCard — the heart of the album screen.
 * Faithfully recreates the Claude Design v2 reference (components.jsx).
 *
 * All 5 sizes (xs/sm/md/lg/xl), all 3 status states, legendario dark variant.
 *
 * ui-ux-pro-max guidance applied:
 * - Pressable root with opacity press feedback (no layout shift, scale-feedback rule)
 * - hitSlop on xs (56×78 is below 44pt min, needs hitSlop)
 * - accessibilityRole="button" + computed label (color not sole indicator)
 * - Top stripe band: two side-by-side Views (left 50% stripe color, right 50% stripe2)
 * - Portrait area: SVG diagonal striped pattern via Lines + BIG faint jersey number
 * - Missing state: transparent bg + dashed border + centered 3-digit number only
 * - Repeated state: dark pill ×N top-right corner
 * - Legendario: dark #1F1B14 bg + gold text + corner gold dot with glow
 * - All colors from C + RARITIES — no hex literals (exception: legendario gold dot
 *   glow uses RARITIES.legendario.dot which resolves to #FFD46B)
 * - numberOfLines={1} on player name (truncation-strategy)
 * - Memoized
 */
import React, { memo } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Line, Rect } from 'react-native-svg';
import { C, RARITIES, cromoDims, radii, FONTS } from '@/theme';
import type { CromoDimKey } from '@/theme';
import type { AlbumCromo } from '@/lib/album-types';

interface CromoCardProps {
  cromo: AlbumCromo;
  size?: CromoDimKey;
  onPress?: () => void;
}

const statusLabel: Record<AlbumCromo['status'], string> = {
  missing: 'falta',
  have: 'tengo',
  repeated: 'repetido',
};

/** Jersey number big font sizes per card size (sm/md/lg/xl) — matches reference */
const JERSEY_FONT_SIZE: Record<CromoDimKey, number> = {
  xs: 0,   // skipped at xs
  sm: 18,
  md: 24,
  lg: 38,
  xl: 56,
};

/** Top stripe height per size */
const STRIPE_HEIGHT: Record<CromoDimKey, number> = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 10,
  xl: 10,
};

/** Portrait area top offset (below stripe + number row) */
const PORTRAIT_TOP: Record<CromoDimKey, number> = {
  xs: 22,
  sm: 28,
  md: 36,
  lg: 36,
  xl: 44,
};

/** Portrait area bottom offset (above name strip, if name shown) */
function portraitBottom(size: CromoDimKey, hasName: boolean): number {
  if (!hasName) return size === 'xs' ? 8 : 10;
  switch (size) {
    case 'sm': return 22;
    case 'md': return 26;
    case 'lg': return 36;
    case 'xl': return 50;
    default:   return 10;
  }
}

function CromoCardInner({ cromo, size = 'sm', onPress }: CromoCardProps) {
  const dims = cromoDims[size];
  const isLegendario = cromo.rarity_id === 'legendario';
  const isMissing = cromo.status === 'missing';
  const isRepeated = cromo.status === 'repeated';

  // Colors
  const legendBg = RARITIES.legendario.bg;   // '#1F1B14'
  const legendText = RARITIES.legendario.text; // '#FFD46B'
  const legendDot = RARITIES.legendario.dot;   // '#FFD46B'

  const cardBg = isMissing ? 'transparent' : isLegendario ? legendBg : '#FAF7F0';
  const numColor = isLegendario ? `rgba(242,232,201,0.65)` : C.muted;
  const inkColor = isLegendario ? legendText : C.ink;

  const showName = dims.name > 0 && !isMissing;
  const showJersey = size !== 'xs' && !isMissing;
  const hasName = dims.name > 0;

  const numStr = String(cromo.n).padStart(3, '0');
  const jerseyStr = cromo.jersey != null ? String(cromo.jersey).padStart(2, '0') : '--';

  const a11yLabel = `Cromo ${cromo.n} ${cromo.country_name} ${cromo.player_name}, ${
    isRepeated ? `repetido ×${cromo.quantity}` : statusLabel[cromo.status]
  }`;

  // Portrait area measurements
  const portTop = PORTRAIT_TOP[size];
  const portBottom = portraitBottom(size, hasName);
  const padH = size === 'xs' ? 5 : 8;
  const portHeight = dims.height - portTop - portBottom - STRIPE_HEIGHT[size];

  // Diagonal stripe pattern via SVG
  const patternBg = isLegendario
    ? `${cromo.accent}22`
    : `${cromo.accent}18`;

  // Name strip padding
  const namePadV = size === 'sm' ? { top: 4, bottom: 5 }
    : size === 'md' ? { top: 5, bottom: 6 }
    : { top: 8, bottom: 10 };
  const namePadH = size === 'sm' ? 7 : size === 'md' ? 7 : 10;

  const headerPadH = size === 'xs' ? 5 : 7;
  const headerPadTop = size === 'xs' ? 4 : 6;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      hitSlop={
        size === 'xs'
          ? { top: 6, bottom: 6, left: 6, right: 6 }
          : { top: 2, bottom: 2, left: 2, right: 2 }
      }
      style={({ pressed }) => [
        {
          width: dims.width,
          height: dims.height,
          // Critical: prevent the row container from squishing the card —
          // without this 15 cards collapse into a single row at ~24px wide.
          flexShrink: 0,
          flexGrow: 0,
          backgroundColor: cardBg,
          borderRadius: radii.md,
          overflow: 'hidden',
          position: 'relative',
          ...(isMissing
            ? {
                borderWidth: 1.5,
                borderColor: C.faint,
                borderStyle: 'dashed',
              }
            : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
                elevation: 2,
              }),
        },
        pressed && { opacity: 0.82, transform: [{ scale: 0.97 }] },
      ]}
    >
      {/* ── MISSING STATE ──────────────────────────────────── */}
      {isMissing && (
        <View style={styles.missingContent}>
          <Text
            style={[
              styles.missingNumber,
              { fontSize: dims.num, color: C.faint },
            ]}
          >
            {numStr}
          </Text>
        </View>
      )}

      {/* ── HAVE / REPEATED STATE ──────────────────────────── */}
      {!isMissing && (
        <>
          {/* Top 2-color stripe band */}
          <View
            style={[
              styles.stripeRow,
              { height: STRIPE_HEIGHT[size] },
            ]}
          >
            <View style={[styles.stripeHalf, { backgroundColor: cromo.stripe }]} />
            <View style={[styles.stripeHalf, { backgroundColor: cromo.stripe2 }]} />
          </View>

          {/* Number + flag header row */}
          <View
            style={[
              styles.headerRow,
              {
                paddingHorizontal: headerPadH,
                paddingTop: headerPadTop,
              },
            ]}
          >
            <Text
              style={[
                styles.cardNumber,
                { fontSize: dims.num, color: numColor },
              ]}
            >
              {numStr}
            </Text>
            <Text style={[styles.flagEmoji, { fontSize: dims.flag }]}>
              {cromo.flag_emoji}
            </Text>
          </View>

          {/* Portrait area: diagonal pattern + big jersey number */}
          {showJersey && portHeight > 0 && (
            <View
              style={[
                styles.portrait,
                {
                  left: padH,
                  right: padH,
                  top: portTop,
                  bottom: portBottom,
                  backgroundColor: patternBg,
                  borderColor: isLegendario
                    ? 'rgba(255,212,107,0.25)'
                    : 'transparent',
                  borderWidth: isLegendario ? 0.5 : 0,
                },
              ]}
            >
              {/* Diagonal stripe SVG overlay */}
              <Svg
                style={StyleSheet.absoluteFillObject}
                width={dims.width - padH * 2}
                height={portHeight}
              >
                <Defs>
                  <Pattern
                    id={`stripe-${cromo.id}-${size}`}
                    x="0"
                    y="0"
                    width="8"
                    height="8"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(135)"
                  >
                    <Line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="8"
                      stroke={
                        isLegendario
                          ? 'rgba(255,212,107,0.25)'
                          : `${cromo.accent}40`
                      }
                      strokeWidth="4"
                    />
                  </Pattern>
                </Defs>
                <Rect
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  fill={`url(#stripe-${cromo.id}-${size})`}
                />
              </Svg>

              {/* Big faint jersey number */}
              <Text
                style={[
                  styles.jerseyNumber,
                  {
                    fontSize: JERSEY_FONT_SIZE[size],
                    color: isLegendario ? legendText : cromo.accent,
                    opacity: isLegendario ? 1 : 0.55,
                  },
                ]}
              >
                {jerseyStr}
              </Text>
            </View>
          )}

          {/* Name strip (bottom) */}
          {showName && (
            <View
              style={[
                styles.nameStrip,
                {
                  paddingTop: namePadV.top,
                  paddingBottom: namePadV.bottom,
                  paddingHorizontal: namePadH,
                  borderTopColor: isLegendario
                    ? 'rgba(242,232,201,0.15)'
                    : C.hairline,
                },
              ]}
            >
              <Text
                style={[
                  styles.playerName,
                  { fontSize: dims.name, color: inkColor },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {cromo.player_name}
              </Text>
              {/* Country code · position — only md+ */}
              {size !== 'sm' && cromo.position && (
                <Text
                  style={[
                    styles.countryPosition,
                    {
                      fontSize: dims.name - 2,
                      color: isLegendario
                        ? `rgba(242,232,201,0.65)`
                        : C.muted,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {cromo.country_code} · {cromo.position}
                </Text>
              )}
            </View>
          )}

          {/* Legendario gold corner dot (top-left, above stripe) */}
          {isLegendario && (
            <View
              style={[
                styles.legendDot,
                {
                  backgroundColor: legendDot,
                  // glow approximation via shadow
                  shadowColor: legendDot,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 4,
                },
              ]}
              accessibilityElementsHidden
            />
          )}

          {/* Repeated pill (top-right) */}
          {isRepeated && (
            <View style={styles.repeatedPill}>
              <Text style={styles.repeatedText}>×{cromo.quantity}</Text>
            </View>
          )}
        </>
      )}
    </Pressable>
  );
}

export default memo(CromoCardInner);

const styles = StyleSheet.create({
  // Missing state
  missingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingNumber: {
    fontFamily: FONTS.mono,
    fontWeight: '500',
    letterSpacing: -0.3,
  },

  // Stripe band
  stripeRow: {
    flexDirection: 'row',
    width: '100%',
  },
  stripeHalf: {
    flex: 1,
  },

  // Header row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardNumber: {
    fontFamily: FONTS.mono,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  flagEmoji: {
    lineHeight: undefined,
    marginTop: -1,
  },

  // Portrait area
  portrait: {
    position: 'absolute',
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  jerseyNumber: {
    fontFamily: FONTS.mono,
    fontWeight: '700',
  },

  // Name strip
  nameStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 0.5,
  },
  playerName: {
    fontFamily: FONTS.manropeBold,
    letterSpacing: -0.2,
    lineHeight: undefined,
  },
  countryPosition: {
    fontFamily: FONTS.mono,
    letterSpacing: 0.4,
    marginTop: 1,
  },

  // Legendario gold dot
  legendDot: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 6,
    height: 6,
    borderRadius: radii.full,
  },

  // Repeated pill
  repeatedPill: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: radii.full,
    backgroundColor: C.ink,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatedText: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    fontWeight: '700',
    color: C.card,
  },
});

export type { CromoCardProps };
