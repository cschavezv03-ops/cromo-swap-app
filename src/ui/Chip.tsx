import { Pressable, Text, View, type PressableProps } from 'react-native';

import { cn } from '@/shared/utils/cn';

type Variant = 'default' | 'selected' | 'outline';
type Size = 'sm' | 'md';

type BaseProps = {
  label: string;
  count?: number;
  variant?: Variant;
  size?: Size;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  className?: string;
};

type Props = BaseProps & Omit<PressableProps, 'children'>;

const sizeStyles: Record<Size, { container: string; text: string }> = {
  sm: { container: 'h-8 px-3', text: 'text-[12px]' },
  md: { container: 'h-9 px-3.5', text: 'text-[13px]' },
};

const variantStyles: Record<Variant, { container: string; text: string }> = {
  default: { container: 'bg-surface', text: 'text-text-secondary' },
  selected: { container: 'bg-text-primary', text: 'text-bg' },
  outline: { container: 'bg-bg border border-border', text: 'text-text-primary' },
};

export function Chip({
  label,
  count,
  variant = 'default',
  size = 'md',
  leftSlot,
  rightSlot,
  className,
  onPress,
  ...rest
}: Props) {
  const sz = sizeStyles[size];
  const vr = variantStyles[variant];
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      className={cn(
        'flex-row items-center rounded-pill gap-1.5',
        sz.container,
        vr.container,
        className,
      )}
      {...rest}
    >
      {leftSlot}
      <Text className={cn(sz.text, 'font-sans-semibold', vr.text)}>{label}</Text>
      {typeof count === 'number' && (
        <Text className={cn(sz.text, 'font-sans-medium opacity-60', vr.text)}>{count}</Text>
      )}
      {rightSlot}
    </Wrapper>
  );
}
