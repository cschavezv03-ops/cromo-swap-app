import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { cn } from '@/shared/utils/cn';
import { useTheme } from '@/theme/ThemeProvider';

import type { AlbumCromo, CountryMeta } from '../lib/types';

import { SectionMark } from './SectionMark';

type Props = {
  cromo: AlbumCromo;
  country: CountryMeta | null;
  onPress?: (cromo: AlbumCromo) => void;
  onLongPress?: (cromo: AlbumCromo) => void;
};

function CromoCardComponent({ cromo, country, onPress, onLongPress }: Props) {
  const { colors } = useTheme();
  const isMissing = cromo.status === 'missing';
  const isRepeated = cromo.status === 'repeated';
  const ownedBadge = isRepeated ? cromo.owned : 0;
  const stripeColor = country?.stripe ?? colors.borderStrong;

  return (
    <Pressable
      onPress={() => onPress?.(cromo)}
      onLongPress={() => onLongPress?.(cromo)}
      delayLongPress={300}
      className={cn('rounded-md overflow-hidden', isMissing ? '' : 'bg-surface-elev')}
      style={
        isMissing
          ? {
              borderWidth: 1.5,
              borderColor: colors.borderStrong,
              borderStyle: 'dashed',
              backgroundColor: 'transparent',
            }
          : {
              borderWidth: 1,
              borderColor: colors.border,
            }
      }
    >
      {!isMissing && (
        <View
          style={{
            height: 4,
            width: '100%',
            backgroundColor: stripeColor,
          }}
        />
      )}
      <View className="p-2" style={{ minHeight: 96 }}>
        <View className="flex-row items-center justify-between">
          <Text
            className={cn(
              'text-[10px] font-sans-semibold',
              isMissing ? 'text-text-tertiary' : 'text-text-secondary',
            )}
          >
            {cromo.printed_code}
          </Text>
          {country && <SectionMark country={country} size="sm" />}
        </View>

        {!isMissing && (
          <>
            <View className="mt-1 flex-1 items-center justify-center">
              <Text className="text-[26px] font-mono text-text-primary" style={{ lineHeight: 30 }}>
                {cromo.jersey ?? cromo.section_number}
              </Text>
            </View>

            <Text
              className="text-center text-[10px] font-sans-semibold text-text-primary"
              numberOfLines={1}
            >
              {cromo.player_name ?? cromo.display_name}
            </Text>
          </>
        )}
      </View>

      {isRepeated && ownedBadge >= 2 && (
        <View
          className="absolute right-1 top-1 h-5 rounded-pill bg-text-primary px-1.5"
          style={{ justifyContent: 'center' }}
        >
          <Text className="text-[10px] font-sans-bold text-bg">x{ownedBadge}</Text>
        </View>
      )}
    </Pressable>
  );
}

export const CromoCard = memo(CromoCardComponent, (prev, next) => {
  return (
    prev.cromo.id === next.cromo.id &&
    prev.cromo.status === next.cromo.status &&
    prev.cromo.owned === next.cromo.owned &&
    prev.cromo.pasted === next.cromo.pasted &&
    prev.country?.code === next.country?.code
  );
});
