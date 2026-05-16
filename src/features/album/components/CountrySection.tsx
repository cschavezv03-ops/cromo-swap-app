import { memo } from 'react';
import { Text, View } from 'react-native';

import { ProgressBar } from '@/ui';

import type { AlbumCromo, CountrySectionData } from '../lib/types';
import { CromoCard } from './CromoCard';

type Props = {
  section: CountrySectionData;
  onPressCromo: (cromo: AlbumCromo) => void;
  onLongPressCromo: (cromo: AlbumCromo) => void;
  cardWidth: number;
};

function CountrySectionComponent({ section, onPressCromo, onLongPressCromo, cardWidth }: Props) {
  const { country, cromos, haveCount, totalCount } = section;
  const pct = totalCount === 0 ? 0 : haveCount / totalCount;

  return (
    <View className="mb-6">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-2xl">{country.flag_emoji}</Text>
          <View>
            <Text className="text-base font-sans-bold text-text-primary">{country.name}</Text>
            <Text className="text-xs font-sans-medium text-text-tertiary">
              {country.code} · {haveCount}/{totalCount}
            </Text>
          </View>
        </View>
        <View style={{ width: 90 }}>
          <ProgressBar value={pct} height={4} />
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {cromos.map((cromo) => (
          <View key={cromo.id} style={{ width: cardWidth }}>
            <CromoCard
              cromo={cromo}
              country={country}
              onPress={onPressCromo}
              onLongPress={onLongPressCromo}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

export const CountrySection = memo(CountrySectionComponent, (prev, next) => {
  return (
    prev.section.country.code === next.section.country.code &&
    prev.section.cromos === next.section.cromos &&
    prev.cardWidth === next.cardWidth
  );
});
