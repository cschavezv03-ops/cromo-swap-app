/**
 * CromoCard — sticker card faithful to the Claude Design v2 reference.
 *
 * Structure (HAVE state):
 *   ┌─────────────────────────┐
 *   │ ▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰ │  ← 2-color top stripe band (jersey colors)
 *   │ 001  04          🇪🇨   │  ← header: small num · big jersey · flag
 *   │       ↑↑                 │
 *   │   diagonal stripes (accent at 12-15% opacity)
 *   │                          │
 *   ├─────────────────────────┤
 *   │ H. NAVARRO              │  ← name strip, white, Manrope bold
 *   └─────────────────────────┘
 *
 * MISSING state: dashed border, just the 3-digit padded number centered.
 * LEGENDARIO: dark bg + gold accents + gold corner dot.
 * REPEATED: dark ×N pill in top-right.
 */
import React, { memo, useMemo } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { C, RARITIES, cromoDims, radii, FONTS } from '@/theme';
import type { CromoDimKey } from '@/theme';
import type { AlbumCromo } from '@/lib/album-types';

interface CromoCardProps {
  cromo: AlbumCromo;
  size?: CromoDimKey;
  onPress?: () => void;
  /** Override the size preset's width — caller computed from screen width. */
  width?: number;
  /** Override the size preset's height — usually computed to keep aspect ratio. */
  height?: number;
}

const statusLabel: Record<AlbumCromo['status'], string> = {
  missing: 'falta',
  have: 'tengo',
  repeated: 'repetido',
};

/** Big jersey number font size per card size (xs is skipped) */
const JERSEY_FONT_SIZE: Record<CromoDimKey, number> = {
  xs: 0,
  sm: 22,
  md: 28,
  lg: 42,
  xl: 60,
};

/** Top stripe band height per size */
const STRIPE_HEIGHT: Record<CromoDimKey, number> = {
  xs: 5,
  sm: 7,
  md: 9,
  lg: 10,
  xl: 12,
};

/** Bottom name-strip height (when name is shown) per size */
const NAME_STRIP_HEIGHT: Record<CromoDimKey, number> = {
  xs: 0,
  sm: 18,
  md: 22,
  lg: 30,
  xl: 42,
};

/**
 * Build an array of diagonal Line coords that fill width × height with
 * stripes at the given angle. Cheaper + more reliable than SVG <Pattern>.
 */
function buildDiagonalLines(
  width: number,
  height: number,
  spacing: number,
): Array<{ x1: number; y1: number; x2: number; y2: number; key: number }> {
  const lines = [];
  // Start lines from -height to width so they cover the whole area when rotated 45°
  const start = -height;
  const end = width;
  let i = 0;
  for (let x = start; x <= end; x += spacing) {
    lines.push({
      x1: x,
      y1: 0,
      x2: x + height,
      y2: height,
      key: i++,
    });
  }
  return lines;
}

function CromoCardInner({ cromo, size = 'sm', onPress, width, height }: CromoCardProps) {
  const preset = cromoDims[size];
  // Use the override when provided, otherwise the size preset.
  const dims = {
    ...preset,
    width: width ?? preset.width,
    height: height ?? preset.height,
  };
  const isLegendario = cromo.rarity_id === 'legendario';
  const isMissing = cromo.status === 'missing';
  const isRepeated = cromo.status === 'repeated';
  const hasName = dims.name > 0 && !isMissing;
  const showJersey = size !== 'xs' && !isMissing;

  // Colors
  const legendBg = RARITIES.legendario.bg;
  const legendText = RARITIES.legendario.text;
  const legendDot = RARITIES.legendario.dot;
  const cardBg = isMissing ? 'transparent' : isLegendario ? legendBg : '#FFFFFF';
  const indexColor = isLegendario ? 'rgba(242,232,201,0.7)' : C.muted;
  const nameColor = isLegendario ? legendText : C.ink;
  const accent = cromo.accent || C.accent;

  const numStr = String(cromo.n).padStart(3, '0');
  const jerseyStr =
    cromo.jersey != null ? String(cromo.jersey).padStart(2, '0') : '--';

  const a11yLabel = `Cromo ${cromo.n} ${cromo.country_name} ${cromo.player_name}, ${
    isRepeated ? `repetido ×${cromo.quantity}` : statusLabel[cromo.status]
  }`;

  // Diagonal stripe overlay (inside the portrait area)
  const stripeBand = STRIPE_HEIGHT[size];
  const nameStrip = hasName ? NAME_STRIP_HEIGHT[size] : 0;
  const portraitW = dims.width;
  const portraitH = dims.height - stripeBand - nameStrip;
  const stripeSpacing = size === 'sm' ? 6 : 8;
  const diagonalLines = useMemo(
    () => (showJersey ? buildDiagonalLines(portraitW, portraitH, stripeSpacing) : []),
    [portraitW, portraitH, stripeSpacing, showJersey],
  );

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
          flexShrink: 0,
          flexGrow: 0,
          backgroundColor: cardBg,
          borderRadius: radii.md,
          position: 'relative',
          // overflow:hidden ONLY when not missing — on Android dashed borders
          // disappear when combined with overflow:hidden.
          ...(isMissing
            ? {
                borderWidth: 2,
                borderColor: '#C9C3B3',
                borderStyle: 'dashed',
                alignItems: 'center',
                justifyContent: 'center',
              }
            : {
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
                borderWidth: 0.5,
                borderColor: C.hairline,
              }),
        },
        pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
      ]}
    >
      {/* ─ MISSING state ──────────────────────────────────── */}
      {isMissing && (
        <Text style={[styles.missingNumber, { fontSize: Math.max(dims.num, 11) }]}>
          {numStr}
        </Text>
      )}

      {/* ─ HAVE / REPEATED state ─────────────────────────── */}
      {!isMissing && (
        <>
          {/* 1) Top 2-color stripe band */}
          <View style={[styles.stripeRow, { height: stripeBand }]}>
            <View style={[styles.stripeHalf, { backgroundColor: cromo.stripe }]} />
            <View style={[styles.stripeHalf, { backgroundColor: cromo.stripe2 }]} />
          </View>

          {/* 2) Portrait area: diagonal stripes background + big jersey number */}
          {showJersey && (
            <View
              style={[
                styles.portrait,
                {
                  top: stripeBand,
                  height: portraitH,
                  backgroundColor: isLegendario
                    ? 'rgba(255,212,107,0.10)'
                    : `${accent}10`,
                },
              ]}
            >
              {/* Diagonal lines drawn explicitly — reliable in RN */}
              <Svg
                width={portraitW}
                height={portraitH}
                style={StyleSheet.absoluteFill}
              >
                {diagonalLines.map((ln) => (
                  <Line
                    key={ln.key}
                    x1={ln.x1}
                    y1={ln.y1}
                    x2={ln.x2}
                    y2={ln.y2}
                    stroke={isLegendario ? 'rgba(255,212,107,0.20)' : accent}
                    strokeWidth={size === 'sm' ? 1.4 : 1.8}
                    strokeOpacity={isLegendario ? 1 : 0.18}
                  />
                ))}
              </Svg>

              {/* Top row over the stripes: small index number + flag */}
              <View style={[styles.headerOver, { paddingHorizontal: 7 }]}>
                <View style={styles.headerLeft}>
                  <Text
                    style={[
                      styles.indexNumber,
                      { fontSize: dims.num, color: indexColor },
                    ]}
                  >
                    {numStr}
                  </Text>
                  {/* Big jersey number inline next to the index */}
                  <Text
                    style={[
                      styles.jerseyNumber,
                      {
                        fontSize: JERSEY_FONT_SIZE[size],
                        color: isLegendario ? legendText : accent,
                        marginLeft: 2,
                      },
                    ]}
                  >
                    {jerseyStr}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.flagEmoji,
                    { fontSize: dims.flag * 0.95 },
                  ]}
                >
                  {cromo.flag_emoji}
                </Text>
              </View>
            </View>
          )}

          {/* 3) Bottom name strip */}
          {hasName && (
            <View
              style={[
                styles.nameStrip,
                {
                  height: nameStrip,
                  paddingHorizontal: size === 'sm' ? 6 : 9,
                  borderTopColor: isLegendario
                    ? 'rgba(242,232,201,0.15)'
                    : C.hairline,
                  backgroundColor: isLegendario ? legendBg : '#FFFFFF',
                },
              ]}
            >
              <Text
                style={[
                  styles.playerName,
                  { fontSize: dims.name, color: nameColor },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {cromo.player_name}
              </Text>
            </View>
          )}

          {/* Legendario gold corner dot */}
          {isLegendario && (
            <View
              style={[
                styles.legendDot,
                {
                  backgroundColor: legendDot,
                  shadowColor: legendDot,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 4,
                },
              ]}
              accessibilityElementsHidden
            />
          )}

          {/* Repeated ×N pill */}
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
  // Missing
  missingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingNumber: {
    fontFamily: FONTS.mono,
    fontWeight: '500',
    color: C.faint,
    letterSpacing: -0.3,
  },

  // Top stripe band
  stripeRow: {
    flexDirection: 'row',
    width: '100%',
  },
  stripeHalf: {
    flex: 1,
  },

  // Portrait area (diagonal stripes + big jersey)
  portrait: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  headerOver: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  indexNumber: {
    fontFamily: FONTS.mono,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  jerseyNumber: {
    fontFamily: FONTS.mono,
    fontWeight: '700',
    letterSpacing: -1.5,
  },
  flagEmoji: {
    lineHeight: undefined,
    marginTop: -1,
  },

  // Bottom name strip
  nameStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    borderTopWidth: 0.5,
  },
  playerName: {
    fontFamily: FONTS.manropeBold,
    letterSpacing: -0.2,
  },

  // Legendario corner dot
  legendDot: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 6,
    height: 6,
    borderRadius: radii.full,
  },

  // Repeated pill
  repeatedPill: {
    position: 'absolute',
    top: 5,
    right: 5,
    minWidth: 18,
    height: 18,
    borderRadius: radii.full,
    backgroundColor: C.ink,
    paddingHorizontal: 5,
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
