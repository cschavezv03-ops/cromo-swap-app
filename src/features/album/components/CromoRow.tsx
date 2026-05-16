import { memo } from 'react';
import { View } from 'react-native';
import { CromoCard } from './CromoCard';
import type { AlbumItem } from '@/features/album/lib/album';

type Props = {
  items: AlbumItem[];
  columns: number;
  cardWidth: number;
  cardHeight: number;
  gap: number;
  onItemPress: (item: AlbumItem) => void;
};

export const CromoRow = memo(function CromoRow({
  items,
  columns,
  cardWidth,
  cardHeight,
  gap,
  onItemPress,
}: Props) {
  return (
    <View className="flex-row" style={{ gap, marginBottom: gap }}>
      {Array.from({ length: columns }).map((_, i) => {
        const item = items[i];
        if (!item) return <View key={`empty-${i}`} style={{ width: cardWidth, height: cardHeight }} />;
        return (
          <CromoCard
            key={item.id ?? `c-${i}`}
            item={item}
            width={cardWidth}
            height={cardHeight}
            onPress={onItemPress}
          />
        );
      })}
    </View>
  );
});
