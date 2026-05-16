import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { cn } from '@/shared/utils/cn';

type Props = {
  value: number; // 0..1
  className?: string;
  trackClassName?: string;
  fillClassName?: string;
  height?: number;
};

export function ProgressBar({
  value,
  className,
  trackClassName,
  fillClassName,
  height = 4,
}: Props) {
  const progress = useSharedValue(0);
  const clamped = Math.max(0, Math.min(1, value));

  useEffect(() => {
    progress.value = withTiming(clamped, { duration: 350 });
  }, [clamped, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View
      style={{ height }}
      className={cn('w-full overflow-hidden rounded-pill bg-surface', trackClassName, className)}
    >
      <Animated.View
        style={animatedStyle}
        className={cn('h-full rounded-pill bg-accent', fillClassName)}
      />
    </View>
  );
}
