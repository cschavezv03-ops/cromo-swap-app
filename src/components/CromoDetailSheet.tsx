/**
 * CromoDetailSheet — sheet content for the cromo detail bottom sheet.
 *
 * ui-ux-pro-max guidance applied:
 * - +/− buttons: 52×52pt circles — exceeds 44pt touch target minimum
 * - − disabled: opacity 0.35 + accessibilityState disabled (disabled-states rule)
 * - Segmented control: ink bg + white text (selected), paper2 container
 * - Disabled tabs: opacity 0.4 + accessibilityState disabled + no press handler
 * - Error placement: inline below controls, role="alert", hotSoft bg / hot text
 * - Guests: segmented control hidden entirely (progressive disclosure rule)
 * - JetBrains Mono for quantity number (number-tabular rule)
 * - ScrollView inside sheet to prevent content overflow on small screens
 * - All colors from C + RARITIES — no hex literals
 *
 * Spec: R4-2-1..R4-2-9
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { C, spacing, radii, FONTS } from '@/theme';
import CromoCard from './CromoCard';
import RarityChip from './RarityChip';
import StateChip from './StateChip';
import { useSession } from '@/lib/session-context';
import { useSetQuantity } from '@/lib/album-queries';
import type { AlbumCromo } from '@/lib/album-types';

interface CromoDetailSheetProps {
  cromo: AlbumCromo;
  onClose?: () => void;
}

const SEGMENTS = [
  { key: 'coleccionar', label: 'Coleccionar', disabled: false },
  { key: 'intercambiar', label: 'Intercambiar', disabled: true },
  { key: 'vender', label: 'Vender', disabled: true },
  { key: 'subastar', label: 'Subastar', disabled: true },
] as const;

export default function CromoDetailSheet({ cromo }: CromoDetailSheetProps) {
  const { isGuest } = useSession();
  const mutation = useSetQuantity();
  const [activeSegment, setActiveSegment] = useState<string>('coleccionar');
  const [mutationError, setMutationError] = useState<string | null>(null);

  const quantity = cromo.quantity;

  const handleIncrement = () => {
    setMutationError(null);
    mutation.mutate(
      { cromoId: cromo.id, quantity: quantity + 1 },
      {
        onError: () => {
          setMutationError('No se pudo guardar. Intentá de nuevo.');
        },
        onSuccess: () => {
          setMutationError(null);
        },
      }
    );
  };

  const handleDecrement = () => {
    if (quantity === 0) return;
    setMutationError(null);
    mutation.mutate(
      { cromoId: cromo.id, quantity: Math.max(0, quantity - 1) },
      {
        onError: () => {
          setMutationError('No se pudo guardar. Intentá de nuevo.');
        },
        onSuccess: () => {
          setMutationError(null);
        },
      }
    );
  };

  const decrementDisabled = quantity === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {/* Hero cromo card — fixed-width 140px is the visual target */}
      <View style={styles.cardWrapper}>
        <CromoCard cromo={cromo} size="md" width={140} />
      </View>

      {/* Rarity chip */}
      <View style={styles.chipRow}>
        <RarityChip rarity={cromo.rarity_id} />
      </View>

      {/* Country / position / jersey row */}
      <View style={styles.metaRow}>
        <Text style={styles.flag}>{cromo.flag_emoji}</Text>
        <Text style={styles.countryName}>{cromo.country_name}</Text>
        {cromo.position && (
          <Text style={styles.metaTag}>{cromo.position}</Text>
        )}
        {cromo.jersey !== null && cromo.jersey !== undefined && (
          <Text style={styles.metaTag}>#{cromo.jersey}</Text>
        )}
      </View>

      {/* Player name */}
      <Text style={styles.playerName} numberOfLines={1}>
        {cromo.player_name}
      </Text>

      {/* State chip */}
      <View style={styles.stateRow}>
        <StateChip status={cromo.status} count={cromo.quantity} />
      </View>

      {/* Quantity controls */}
      <View style={styles.quantityRow}>
        {/* − button */}
        <Pressable
          onPress={handleDecrement}
          disabled={decrementDisabled}
          accessibilityRole="button"
          accessibilityLabel="Reducir cantidad"
          accessibilityState={{ disabled: decrementDisabled }}
          style={({ pressed }) => [
            styles.qtyBtn,
            decrementDisabled && styles.qtyBtnDisabled,
            pressed && !decrementDisabled && styles.qtyBtnPressed,
          ]}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Text style={[styles.qtyBtnText, decrementDisabled && styles.qtyBtnTextDisabled]}>
            −
          </Text>
        </Pressable>

        {/* Quantity display */}
        <View style={styles.quantityDisplay}>
          {mutation.isPending ? (
            <ActivityIndicator size="small" color={C.accent} />
          ) : (
            <Text style={styles.quantityText}>{quantity}</Text>
          )}
        </View>

        {/* + button */}
        <Pressable
          onPress={handleIncrement}
          accessibilityRole="button"
          accessibilityLabel="Aumentar cantidad"
          style={({ pressed }) => [
            styles.qtyBtn,
            pressed && styles.qtyBtnPressed,
          ]}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Text style={styles.qtyBtnText}>+</Text>
        </Pressable>
      </View>

      {/* Inline error message */}
      {mutationError && (
        <View
          style={styles.errorBox}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.errorText}>{mutationError}</Text>
        </View>
      )}

      {/* Segmented control — registered users only */}
      {!isGuest && (
        <View style={styles.segmentedContainer}>
          {SEGMENTS.map((seg) => {
            const isActive = activeSegment === seg.key;
            return (
              <Pressable
                key={seg.key}
                onPress={seg.disabled ? undefined : () => setActiveSegment(seg.key)}
                disabled={seg.disabled}
                accessibilityRole="tab"
                accessibilityLabel={
                  seg.disabled ? `${seg.label}, próximamente` : seg.label
                }
                accessibilityState={{ selected: isActive, disabled: seg.disabled }}
                style={[
                  styles.segment,
                  isActive && styles.segmentActive,
                  seg.disabled && styles.segmentDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    isActive && styles.segmentTextActive,
                    seg.disabled && styles.segmentTextDisabled,
                  ]}
                  numberOfLines={1}
                >
                  {seg.label}
                </Text>
                {seg.disabled && (
                  <Text style={styles.soonLabel}>· próx.</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Bottom spacer */}
      <View style={{ height: spacing[4] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing[6],
    paddingTop: spacing[2],
  },
  cardWrapper: {
    marginBottom: spacing[4],
  },
  chipRow: {
    marginBottom: spacing[3],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  flag: {
    fontSize: 18,
  },
  countryName: {
    fontFamily: FONTS.manropeSemiBold,
    fontSize: 14,
    color: C.ink2,
  },
  metaTag: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: C.muted,
    backgroundColor: C.paper2,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  playerName: {
    fontFamily: FONTS.manropeSemiBold,
    fontSize: 16,
    color: C.ink,
    marginBottom: spacing[3],
    textAlign: 'center',
  },
  stateRow: {
    marginBottom: spacing[4],
  },
  // Quantity controls
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[6],
    marginBottom: spacing[3],
  },
  qtyBtn: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: {
    backgroundColor: C.faint,
    opacity: 0.45,
  },
  qtyBtnPressed: {
    opacity: 0.75,
  },
  qtyBtnText: {
    fontFamily: FONTS.manropeBold,
    fontSize: 22,
    color: C.card,
    lineHeight: 26,
    includeFontPadding: false,
  },
  qtyBtnTextDisabled: {
    color: C.paper,
  },
  quantityDisplay: {
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontFamily: FONTS.mono,
    fontSize: 28,
    color: C.ink,
    lineHeight: 34,
  },
  // Error
  errorBox: {
    backgroundColor: C.hotSoft,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    marginBottom: spacing[4],
    alignSelf: 'stretch',
  },
  errorText: {
    fontFamily: FONTS.manrope,
    fontSize: 13,
    color: C.hot,
    textAlign: 'center',
  },
  // Segmented control
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: C.paper2,
    borderRadius: radii.full,
    padding: 3,
    gap: 2,
    alignSelf: 'stretch',
    marginTop: spacing[2],
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[1],
    borderRadius: radii.full,
    gap: 2,
  },
  segmentActive: {
    backgroundColor: C.ink,
  },
  segmentDisabled: {
    opacity: 0.45,
  },
  segmentText: {
    fontFamily: FONTS.manropeSemiBold,
    fontSize: 10,
    color: C.ink2,
    textAlign: 'center',
  },
  segmentTextActive: {
    color: C.card,
  },
  segmentTextDisabled: {
    color: C.muted,
  },
  soonLabel: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: C.faint,
  },
});

export type { CromoDetailSheetProps };
