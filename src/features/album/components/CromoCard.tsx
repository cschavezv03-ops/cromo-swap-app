import { memo, useCallback } from 'react';
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Text } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import type { AlbumItem } from '@/features/album/lib/album';

type Props = {
  item: AlbumItem;
  width: number;
  height: number;
  onTap: (item: AlbumItem) => void;
  onLongPress: (item: AlbumItem) => void;
};

export const CromoCard = memo(function CromoCard({
  item,
  width,
  height,
  onTap,
  onLongPress,
}: Props) {
  const code = item.printed_code ?? String(item.section_number ?? '').padStart(3, '0');
  const jersey = item.jersey != null ? String(item.jersey) : code;
  const accent = item.accent ?? '#15140F';

  const handleTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onTap(item);
  }, [onTap, item]);

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    onLongPress(item);
  }, [onLongPress, item]);

  return (
    <Pressable
      onPress={handleTap}
      onLongPress={handleLongPress}
      delayLongPress={300}
      style={{ width, height }}
      android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: false }}
      className={cn(
        'overflow-hidden rounded-md border',
        item.isMissing ? 'border-ink-100 bg-cream-200' : 'border-ink-100 bg-white',
      )}
    >
      {item.isMissing ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-base font-bold text-ink-300">{code}</Text>
        </View>
      ) : (
        <>
          <View style={{ height: 5, backgroundColor: accent }} />
          <View className="flex-1 px-2 pt-1.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-2xs font-medium text-ink-500">{code}</Text>
              <Text className="text-xs leading-none">{item.flag_emoji ?? ''}</Text>
            </View>
            <View className="flex-1 items-center justify-center">
              <Text
                style={{ color: accent }}
                className="text-3xl font-extrabold"
                numberOfLines={1}
              >
                {jersey}
              </Text>
            </View>
            <Text
              className="pb-1 text-2xs font-semibold uppercase text-ink-700"
              numberOfLines={1}
            >
              {item.player_name ?? item.display_name ?? ''}
            </Text>
          </View>
        </>
      )}
      {item.isRepeated ? (
        <View className="absolute right-1 top-1 h-5 min-w-[22px] items-center justify-center rounded-full bg-ink-900 px-1.5">
          <Text className="text-2xs font-bold text-cream">x{item.ownedQuantity}</Text>
        </View>
      ) : null}
    </Pressable>
  );
});
