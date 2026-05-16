import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { cn } from '@/shared/utils/cn';

type Props = {
  eyebrow?: string;
  title: string;
  rightSlot?: ReactNode;
  onBack?: () => void;
  className?: string;
};

export function ScreenHeader({ eyebrow, title, rightSlot, onBack, className }: Props) {
  return (
    <View className={cn('px-5 pt-2 pb-4', className)}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          {onBack && (
            <Pressable
              onPress={onBack}
              hitSlop={8}
              className="-ml-1 mb-1 h-9 w-9 items-center justify-center rounded-md"
            >
              <Text className="text-text-primary text-xl">←</Text>
            </Pressable>
          )}
          {eyebrow && (
            <Text className="mb-1 text-xs font-sans-semibold uppercase tracking-[0.18em] text-text-tertiary">
              {eyebrow}
            </Text>
          )}
          <Text className="text-text-primary text-3xl font-sans-black">{title}</Text>
        </View>
        {rightSlot && <View className="flex-row items-center gap-2">{rightSlot}</View>}
      </View>
    </View>
  );
}
