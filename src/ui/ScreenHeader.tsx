import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { cn } from '@/shared/utils/cn';
import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  eyebrow?: string;
  title: string;
  rightSlot?: ReactNode;
  onBack?: () => void;
  className?: string;
};

export function ScreenHeader({ eyebrow, title, rightSlot, onBack, className }: Props) {
  const { colors } = useTheme();
  return (
    <View className={cn('px-5 pt-2 pb-4', className)}>
      <View className="flex-row items-end justify-between">
        <View className="flex-1">
          {onBack && (
            <Pressable
              onPress={onBack}
              hitSlop={8}
              className="-ml-2 mb-2 h-9 w-9 items-center justify-center rounded-pill"
              android_ripple={{ color: colors.surface, borderless: true, radius: 18 }}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M15 5l-7 7 7 7"
                  stroke={colors.textPrimary}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
          )}
          {eyebrow && (
            <Text className="mb-1 text-[11px] font-sans-semibold uppercase tracking-[0.16em] text-text-tertiary">
              {eyebrow}
            </Text>
          )}
          <Text
            className="text-text-primary text-[26px] font-sans-bold"
            style={{ letterSpacing: -0.4, lineHeight: 32 }}
          >
            {title}
          </Text>
        </View>
        {rightSlot && <View className="flex-row items-center gap-2 pb-1">{rightSlot}</View>}
      </View>
    </View>
  );
}
