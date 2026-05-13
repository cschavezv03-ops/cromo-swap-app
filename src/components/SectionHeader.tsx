/**
 * SectionHeader — sticky country section header for the album SectionList.
 *
 * ui-ux-pro-max guidance applied:
 * - Solid C.paper background (required for sticky headers — no transparency)
 * - Bottom hairline border as section separator
 * - Flag emoji in data display context (acceptable — it's country data, not a structural icon)
 * - JetBrains Mono for country code (scannable, consistent with design system)
 * - ProgressRing sm (24px) pushed to right via marginLeft: 'auto' — clean right-align
 * - zIndex: 2 ensures it stays above card grid when sticky
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, spacing, FONTS } from '@/theme';
import ProgressRing from './ProgressRing';

interface SectionHeaderProps {
  flagEmoji: string;
  countryCode: string;
  countryName: string;
  ownedCount: number;
  total: number;
}

export default function SectionHeader({
  flagEmoji,
  countryCode,
  countryName,
  ownedCount,
  total,
}: SectionHeaderProps) {
  const pct = total > 0 ? Math.round((ownedCount / total) * 100) : 0;

  return (
    <View
      style={styles.container}
      accessibilityRole="header"
      accessibilityLabel={`${countryName}: ${ownedCount} de ${total} cromos`}
    >
      {/* Flag + code block */}
      <Text style={styles.flag} accessibilityElementsHidden>
        {flagEmoji}
      </Text>
      <Text style={styles.code}>{countryCode}</Text>

      {/* Country name */}
      <Text style={styles.name} numberOfLines={1}>
        {countryName}
      </Text>

      {/* Right: progress ring + X/Y count */}
      <ProgressRing size="sm" pct={pct} />
      <Text style={styles.count}>
        {ownedCount}/{total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: C.paper,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
    zIndex: 2,
    gap: spacing[2],
  },
  flag: {
    fontSize: 18,
    lineHeight: 22,
  },
  code: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: C.accent,
    letterSpacing: 0.5,
  },
  name: {
    fontFamily: FONTS.manropeSemiBold,
    fontSize: 13,
    color: C.ink2,
    flex: 1,
  },
  count: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: C.muted,
    marginLeft: spacing[1],
  },
});

export type { SectionHeaderProps };
