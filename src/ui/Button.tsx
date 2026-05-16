import { forwardRef } from 'react';
import { ActivityIndicator, Pressable, Text, View, type PressableProps } from 'react-native';

import { cn } from '@/shared/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  className?: string;
};

const sizeStyles: Record<Size, { container: string; text: string }> = {
  sm: { container: 'h-9 px-3 rounded-md', text: 'text-sm' },
  md: { container: 'h-11 px-4 rounded-md', text: 'text-base' },
  lg: { container: 'h-14 px-5 rounded-lg', text: 'text-lg' },
};

const variantStyles: Record<Variant, { container: string; text: string; pressed: string }> = {
  primary: {
    container: 'bg-accent',
    text: 'text-white font-sans-semibold',
    pressed: 'opacity-80',
  },
  secondary: {
    container: 'bg-surface border border-border',
    text: 'text-text-primary font-sans-semibold',
    pressed: 'bg-surface-elev',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-accent font-sans-semibold',
    pressed: 'bg-accent-soft',
  },
  danger: {
    container: 'bg-danger',
    text: 'text-white font-sans-semibold',
    pressed: 'opacity-80',
  },
};

export const Button = forwardRef<View, Props>(function Button(
  {
    label,
    variant = 'primary',
    size = 'md',
    loading = false,
    leftSlot,
    rightSlot,
    disabled,
    className,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const sz = sizeStyles[size];
  const vr = variantStyles[variant];

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center',
        sz.container,
        vr.container,
        isDisabled && 'opacity-50',
        className,
      )}
      {...rest}
    >
      {({ pressed }) => (
        <View
          className={cn(
            'flex-row items-center justify-center gap-2',
            pressed && !isDisabled && vr.pressed,
          )}
        >
          {loading ? (
            <ActivityIndicator color={variant === 'secondary' ? '#0B0B0E' : '#FFFFFF'} />
          ) : (
            <>
              {leftSlot}
              <Text className={cn(sz.text, vr.text)}>{label}</Text>
              {rightSlot}
            </>
          )}
        </View>
      )}
    </Pressable>
  );
});
