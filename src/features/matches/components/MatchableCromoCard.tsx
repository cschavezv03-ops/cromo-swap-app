import { memo } from 'react';
import { Text, View } from 'react-native';

import type { MatchableCromo } from '../data/match-detail';

type Props = {
  cromo: MatchableCromo;
  /** Si es `true`, muestra un badge superior con la cantidad disponible (`x2`, `x3`). */
  showCount?: boolean;
};

/**
 * Tarjeta read-only de un cromo para el grid del detalle de match.
 * Sigue el mismo lenguaje visual que `CromoCard` del álbum pero sin
 * estado "missing" — aquí todo lo que se muestra está disponible.
 */
function MatchableCromoCardComponent({ cromo, showCount = true }: Props) {
  const stripeColor = cromo.stripe ?? '#9CA3AF';
  const flag = cromo.flag_emoji ?? '🏳️';
  const jerseyOrNumber = cromo.jersey ?? cromo.section_number;
  const displayLabel = cromo.player_name ?? cromo.display_name;
  const showRepeatedBadge = showCount && cromo.available_quantity >= 2;

  return (
    <View
      className="rounded-md overflow-hidden bg-surface-elev"
      style={{ borderWidth: 1, borderColor: '#E5E5EA' }}
    >
      <View style={{ height: 4, width: '100%', backgroundColor: stripeColor }} />
      <View className="p-2" style={{ minHeight: 96 }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-[10px] font-sans-semibold text-text-secondary">
            {cromo.printed_code}
          </Text>
          <Text className="text-xs" numberOfLines={1}>
            {flag}
          </Text>
        </View>
        <View className="mt-1 flex-1 items-center justify-center">
          <Text className="text-[26px] font-mono text-text-primary" style={{ lineHeight: 30 }}>
            {jerseyOrNumber}
          </Text>
        </View>
        <Text
          className="text-center text-[10px] font-sans-semibold text-text-primary"
          numberOfLines={1}
        >
          {displayLabel}
        </Text>
      </View>
      {showRepeatedBadge && (
        <View
          className="absolute right-1 top-1 h-5 rounded-pill bg-text-primary px-1.5"
          style={{ justifyContent: 'center' }}
        >
          <Text className="text-[10px] font-sans-bold text-bg">x{cromo.available_quantity}</Text>
        </View>
      )}
    </View>
  );
}

export const MatchableCromoCard = memo(MatchableCromoCardComponent, (prev, next) => {
  return (
    prev.cromo.id === next.cromo.id &&
    prev.cromo.available_quantity === next.cromo.available_quantity &&
    prev.showCount === next.showCount
  );
});
