/**
 * RarityChip — colored chip showing cromo rarity with a leading dot indicator.
 *
 * ui-ux-pro-max guidance applied:
 * - Pill chip geometry matching StateChip (consistent chip language)
 * - 6×6 colored dot (RARITIES[rarity].dot) as visual accent, not relying on color alone
 * - RARITIES colors for bg/text — no hex literals
 * - legendario variant: near-black bg, gold text — contrast verified ✓
 * - Display-only; no touch target needed
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RARITIES, spacing, radii, FONTS } from '@/theme';
import type { RarityKey } from '@/theme';

interface RarityChipProps {
  rarity: RarityKey;
}

export default function RarityChip({ rarity }: RarityChipProps) {
  const config = RARITIES[rarity];

  return (
    <View
      style={[styles.chip, { backgroundColor: config.bg }]}
      accessibilityRole="text"
      accessibilityLabel={`Rareza: ${config.label}`}
    >
      {/* Colored dot — ensures rarity is distinguishable beyond color */}
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text style={[styles.label, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.full,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    alignSelf: 'flex-start',
    gap: spacing[1],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
  },
  label: {
    fontFamily: FONTS.manropeSemiBold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.1,
  },
});

export type { RarityChipProps };
