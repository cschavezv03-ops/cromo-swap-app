/**
 * CromoCard — the heart of the album screen.
 * All 5 sizes (xs/sm/md/lg/xl), all 3 status states, legendario dark variant.
 *
 * ui-ux-pro-max guidance applied:
 * - Pressable root with opacity press feedback (no layout shift)
 * - hitSlop on all sizes — xs (56×78) is below 44pt minimum, needs hitSlop
 * - accessibilityRole="button" + computed label (status communicated via text, not only color)
 * - SVG jersey-stripe motif: two Rect strips, skipped at xs for perf
 * - Missing state: dashed border + transparent bg (color not the only indicator — border style)
 * - Repeated state: ×N pill (text, not just color)
 * - Legendario: dark bg + gold text — contrast ~9:1 ✓
 * - All colors from C + RARITIES — no hex literals
 * - numberOfLines={1} truncation on player name
 */
import React, { memo } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { C, RARITIES, cromoDims, radii, spacing, FONTS } from '@/theme';
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

function CromoCardInner({ cromo, size = 'sm', onPress }: CromoCardProps) {
  const dims = cromoDims[size];
  const isLegendario = cromo.rarity_id === 'legendario';
  const isMissing = cromo.status === 'missing';
  const isRepeated = cromo.status === 'repeated';
  const showStripes = size !== 'xs' && !isMissing;
  const showName = dims.name > 0 && !isMissing;
  const rarity = RARITIES[cromo.rarity_id];

  // Colors
  const bg = isMissing ? 'transparent' : isLegendario ? rarity.bg : C.card;
  const numColor = isMissing ? C.faint : isLegendario ? rarity.text : C.ink2;
  const codeColor = isLegendario ? rarity.text : C.accent;
  const nameColor = isLegendario ? rarity.text : C.ink2;

  const a11yLabel = `Cromo ${cromo.n} ${cromo.country_name} ${cromo.player_name}, ${isRepeated ? `repetido ×${cromo.quantity}` : statusLabel[cromo.status]}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      style={({ pressed }) => [
        styles.card,
        {
          width: dims.width,
          height: dims.height,
          backgroundColor: bg,
          borderRadius: size === 'lg' || size === 'xl' ? radii.lg : radii.md,
        },
        isMissing && styles.missingBorder,
        !isMissing && styles.haveShadow,
        pressed && styles.pressed,
      ]}
    >
      {/* Jersey-stripe SVG motif — skip at xs for perf, skip when missing */}
      {showStripes && (
        <Svg
          style={StyleSheet.absoluteFillObject}
          width={dims.width}
          height={dims.height}
        >
          {/* Left stripe */}
          <Rect
            x={0}
            y={0}
            width={dims.width * 0.28}
            height={dims.height}
            fill={cromo.stripe}
            opacity={0.2}
          />
          {/* Right stripe */}
          <Rect
            x={dims.width * 0.72}
            y={0}
            width={dims.width * 0.28}
            height={dims.height}
            fill={cromo.stripe2}
            opacity={0.2}
          />
          {/* Jersey number overlay — centered, large, faint */}
          <SvgText
            x={dims.width / 2}
            y={dims.height / 2 + dims.num * 0.4}
            textAnchor="middle"
            fontSize={dims.num * 2.5}
            fontFamily={FONTS.mono}
            fill={isLegendario ? rarity.text : C.hairline}
            opacity={0.35}
          >
            {cromo.n}
          </SvgText>
        </Svg>
      )}

      {/* Top row: flag + country code | rarity dot */}
      {!isMissing && (
        <View style={styles.topRow}>
          <Text style={[styles.flag, { fontSize: dims.flag * 0.6 }]}>
            {cromo.flag_emoji}
          </Text>
          <Text style={[styles.code, { fontSize: dims.flag * 0.45, color: codeColor }]}>
            {cromo.country_code}
          </Text>
          <View style={styles.topRight}>
            {/* Repeated pill */}
            {isRepeated && (
              <View style={styles.repeatedPill}>
                <Text style={styles.repeatedText}>×{cromo.quantity}</Text>
              </View>
            )}
            {/* Rarity dot */}
            <View
              style={[styles.rarityDot, { backgroundColor: rarity.dot }]}
              accessibilityElementsHidden
            />
          </View>
        </View>
      )}

      {/* Missing state: only faint number */}
      {isMissing && (
        <View style={styles.missingContent}>
          <Text
            style={[styles.missingNumber, { fontSize: dims.num * 1.2, color: C.faint }]}
          >
            {cromo.n}
          </Text>
        </View>
      )}

      {/* Bottom row: number + player name */}
      {!isMissing && (
        <View style={styles.bottomRow}>
          <Text style={[styles.number, { fontSize: dims.num, color: numColor }]}>
            {cromo.n}
          </Text>
          {showName && (
            <Text
              style={[styles.name, { fontSize: dims.name, color: nameColor }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {cromo.player_name}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

export default memo(CromoCardInner);

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    position: 'relative',
  },
  missingBorder: {
    borderWidth: 1.5,
    borderColor: C.faint,
    borderStyle: 'dashed',
    // Slightly rounded even for missing
    borderRadius: radii.md,
  },
  haveShadow: {
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  pressed: {
    opacity: 0.82,
  },
  topRow: {
    position: 'absolute',
    top: spacing[1],
    left: spacing[1],
    right: spacing[1],
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    lineHeight: undefined, // let system size it
    marginRight: 1,
  },
  code: {
    fontFamily: FONTS.mono,
    letterSpacing: 0.3,
  },
  topRight: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  repeatedPill: {
    backgroundColor: C.ink,
    borderRadius: radii.full,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  repeatedText: {
    fontFamily: FONTS.manropeBold,
    fontSize: 8,
    color: C.card,
  },
  rarityDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
  },
  bottomRow: {
    position: 'absolute',
    bottom: spacing[1],
    left: spacing[1],
    right: spacing[1],
  },
  number: {
    fontFamily: FONTS.mono,
    lineHeight: undefined,
  },
  name: {
    fontFamily: FONTS.manrope,
    lineHeight: undefined,
    marginTop: 1,
  },
  missingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingNumber: {
    fontFamily: FONTS.mono,
    opacity: 0.5,
  },
});

export type { CromoCardProps };
