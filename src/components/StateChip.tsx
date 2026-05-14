/**
 * StateChip — display chip for cromo inventory status.
 *
 * ui-ux-pro-max guidance applied:
 * - Pill shape (radii.full), spacing from design tokens
 * - Semantic color mapping from C palette (no hex literals)
 * - FONTS.manropeSemiBold for legibility at small sizes
 * - Display-only (not interactive); no touch target needed
 * - Count shown only for 'repeated' status
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, spacing, radii, FONTS } from '@/theme';
import type { CromoStatus } from '@/lib/album-types';

interface StateChipProps {
  status: CromoStatus;
  /** Only shown when status === 'repeated' */
  count?: number;
}

const CONFIG: Record<
  CromoStatus,
  { bg: string; text: string; label: string }
> = {
  missing: { bg: C.hotSoft, text: C.hot, label: 'Falta' },
  have:    { bg: C.accentSoft, text: C.accent, label: 'Tengo' },
  repeated:{ bg: C.paper2, text: C.ink2, label: '×' },
};

export default function StateChip({ status, count }: StateChipProps) {
  const { bg, text, label } = CONFIG[status];
  const displayLabel =
    status === 'repeated' && count !== undefined ? `×${count}` : label;

  return (
    <View
      style={[styles.chip, { backgroundColor: bg }]}
      accessibilityRole="text"
      accessibilityLabel={displayLabel}
    >
      <Text style={[styles.label, { color: text }]}>{displayLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radii.full,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FONTS.manropeSemiBold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.1,
  },
});

export type { StateChipProps };
