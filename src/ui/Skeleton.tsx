import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { cn } from '@/shared/utils/cn';

type Props = {
  width?: number | `${number}%`;
  height?: number;
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'pill';
};

const roundedClass = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  pill: 'rounded-pill',
};

export function Skeleton({ width = '100%', height = 16, className, rounded = 'sm' }: Props) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ width, height }, animatedStyle]}
      className={cn('bg-surface', roundedClass[rounded], className)}
    />
  );
}
