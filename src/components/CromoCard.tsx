/**
 * CromoCard — sticker card, faithful to Claude Design v3 (components.jsx).
 *
 * The card is FLEX-SIZED: it fills 100% width of its parent column and uses
 * `aspectRatio` for height. The parent is responsible for the column layout
 * (`<View style={{flex:1}}>` inside a row of N items = N equal columns).
 * That way the card scales correctly on any screen width.
 *
 * Two sizes:
 *   - 'sm' (4-col grid): 72×100 aspect = 0.72
 *   - 'md' (3-col grid): 92×128 aspect = 0.71875 (call it 92/128)
 *
 * States:
 *   - missing: dashed border (drawn via SVG — RN's borderStyle:dashed is
 *     broken on Android), centered 3-digit padded number, transparent bg.
 *   - have: top 2-color stripe, header (num+flag), portrait area with
 *     diagonal stripes + big jersey number, bottom name strip.
 *   - repeated: like have + dark ×N pill top-right.
 *   - legendario: dark bg + gold accents + gold corner dot.
 */
import React, { memo } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { C } from '@/theme';
import type { AlbumCromo } from '@/lib/album-types';

const FONT_MANROPE = 'Manrope_700Bold';
const FONT_MANROPE_X = 'Manrope_800ExtraBold';
const FONT_MONO = 'JetBrainsMono_400Regular';

const LEGEND_BG = '#1F1B14';
const LEGEND_TEXT = '#F2E8C9';
const LEGEND_GOLD = '#FFD46B';

type Size = 'sm' | 'md';

interface CromoCardProps {
  cromo: AlbumCromo;
  size?: Size;
  onPress?: () => void;
  /** Explicit width passed from the parent grid (computed from screen width). */
  width: number;
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
  const height = Math.round(width / t.aspect);
  const isLegend = cromo.rarity_id === 'legendario';
  const isMissing = cromo.status === 'missing';
  const isRepeated = cromo.status === 'repeated';

  const numStr = String(cromo.n).padStart(3, '0');
  const jerseyStr = cromo.jersey != null ? String(cromo.jersey).padStart(2, '0') : '--';

  const a11yLabel = `Cromo ${cromo.n} ${cromo.country_name}, ${
    isMissing ? 'falta' : isRepeated ? `repetido ×${cromo.quantity}` : 'tengo'
  }`;

  // ────── MISSING ──────
  // Solid 1.5px border in #B8B3A6 (C.faint) with a faint warm fill —
  // visually reads as a physical empty album slot, exactly the same size
  // as a HAVE card.
  if (isMissing) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        style={({ pressed }) => [
          styles.cardRoot,
          {
            width,
            height,
            backgroundColor: '#F0EBDC',
            borderWidth: 1.5,
            borderColor: '#B8B3A6',
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          },
          pressed && { opacity: 0.6, transform: [{ scale: 0.97 }] },
        ]}
      >
        <Text style={[styles.missingNum, { fontSize: t.numFont + 1 }]}>{numStr}</Text>
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
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={({ pressed }) => [
        styles.cardRoot,
        {
          width,
          height,
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
          {/* Diagonal stripe pattern: ~25 lines at 45° */}
          {Array.from({ length: 26 }).map((_, i) => {
            const offset = i * 7 - 60;
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
