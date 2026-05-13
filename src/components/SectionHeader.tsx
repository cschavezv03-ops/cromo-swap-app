/**
 * SectionHeader — per-country section header for the album view.
 * Faithfully recreates the Claude Design v2 reference (screens-main.jsx).
 *
 * Layout: flag emoji + (country name ExtraBold / code·N/total mono) + right-aligned
 * 80px ProgressBar filled with the country's accent color.
 *
 * ui-ux-pro-max guidance applied:
 * - accessibilityRole="header" + label
 * - Flag emoji is country data (acceptable per no-emoji-icons rule)
 * - backgroundColor C.paper for sticky rendering above card grid
 * - ProgressBar (height 4) instead of ProgressRing — matches the design reference
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, spacing, FONTS } from '@/theme';

interface SectionHeaderProps {
  flagEmoji: string;
  countryCode: string;
  countryName: string;
  ownedCount: number;
  total: number;
  /** Country accent color for the progress bar fill */
  accent?: string;
}

export default function SectionHeader({
  flagEmoji,
  countryCode,
  countryName,
  ownedCount,
  total,
  accent = C.accent,
}: SectionHeaderProps) {
  const pct = total > 0 ? (ownedCount / total) * 100 : 0;

  return (
    <View
      style={styles.container}
      accessibilityRole="header"
      accessibilityLabel={`${countryName}: ${ownedCount} de ${total} cromos`}
    >
      {/* Flag emoji */}
      <Text style={styles.flag} accessibilityElementsHidden>
        {flagEmoji}
      </Text>

      {/* Country name + code · N/total */}
      <View style={styles.nameBlock}>
        <Text style={styles.countryName} numberOfLines={1}>
          {countryName}
        </Text>
        <Text style={styles.countryMeta}>
          {countryCode} · {ownedCount}/{total}
        </Text>
      </View>

      {/* Accent-colored thin progress bar — 80px wide */}
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.min(pct, 100)}%`,
              backgroundColor: accent,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],  // 20px — matches design
    paddingVertical: spacing[2] + 2, // ~10px
    paddingBottom: spacing[2] + 2,
    backgroundColor: C.paper,
    zIndex: 2,
    gap: spacing[2],
  },
  flag: {
    fontSize: 22,
    lineHeight: 28,
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
  },
  countryName: {
    fontFamily: FONTS.manropeExtraBold,
    fontSize: 15,
    letterSpacing: -0.3,
    color: C.ink,
    lineHeight: 19,
  },
  countryMeta: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.3,
    marginTop: 0,
  },
  barTrack: {
    width: 80,
    height: 4,
    backgroundColor: C.paper2,
    borderRadius: 99,
    overflow: 'hidden',
    flexShrink: 0,
  },
  barFill: {
    height: '100%',
    borderRadius: 99,
  },
});

export type { SectionHeaderProps };
