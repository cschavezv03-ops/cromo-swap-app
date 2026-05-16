import { ActivityIndicator, Pressable, type PressableProps, View } from 'react-native';
import { cn } from '@/shared/lib/cn';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
};

const container: Record<Variant, string> = {
  primary: 'bg-ink-900 active:bg-ink-800',
  secondary: 'bg-cream-200 border border-ink-100 active:bg-cream-300',
  ghost: 'bg-transparent active:bg-cream-200',
  danger: 'bg-danger active:opacity-80',
};

const label: Record<Variant, string> = {
  primary: 'text-cream',
  secondary: 'text-ink-900',
  ghost: 'text-ink-900',
  danger: 'text-white',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 rounded-full',
  md: 'h-11 px-5 rounded-full',
  lg: 'h-14 px-6 rounded-full',
};

const labelSize: Record<Size, string> = {
  sm: 'text-sm font-semibold',
  md: 'text-base font-semibold',
  lg: 'text-base font-semibold',
};

export function Button({
  label: text,
  variant = 'primary',
  size = 'md',
  loading,
  leftIcon,
  rightIcon,
  disabled,
  className,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center gap-2',
        sizes[size],
        container[variant],
        isDisabled && 'opacity-50',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#F7F4ED' : '#15140F'} />
      ) : (
        <>
          {leftIcon ? <View>{leftIcon}</View> : null}
          <Text className={cn(labelSize[size], label[variant])}>{text}</Text>
          {rightIcon ? <View>{rightIcon}</View> : null}
        </>
      )}
    </Pressable>
  );
}
