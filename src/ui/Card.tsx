import type { ReactNode } from 'react';
import { Pressable, View, type PressableProps, type ViewProps } from 'react-native';

import { cn } from '@/shared/utils/cn';

type Variant = 'elevated' | 'flat' | 'outline';

type CardProps = ViewProps & {
  children: ReactNode;
  variant?: Variant;
  className?: string;
};

const variantStyles: Record<Variant, string> = {
  elevated: 'bg-surface-elev rounded-lg',
  flat: 'bg-surface rounded-lg',
  outline: 'bg-bg border border-border rounded-lg',
};

export function Card({ children, variant = 'flat', className, ...rest }: CardProps) {
  return (
    <View className={cn('p-4', variantStyles[variant], className)} {...rest}>
      {children}
    </View>
  );
}

type PressableCardProps = Omit<PressableProps, 'children'> & {
  children: ReactNode;
  variant?: Variant;
  className?: string;
};

export function PressableCard({
  children,
  variant = 'flat',
  className,
  ...rest
}: PressableCardProps) {
  return (
    <Pressable
      className={cn(
        'p-4 active:opacity-80',
        variantStyles[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
