import { Text, View } from 'react-native';

import { cn } from '@/shared/utils/cn';

type Props = {
  /** ISO country code (3 letters) e.g. ARG, BRA */
  code: string;
  /** Country stripe color from `countries.stripe` */
  color?: string;
  /** Country accent color from `countries.accent` */
  accentColor?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeStyles: Record<NonNullable<Props['size']>, { container: string; text: string }> = {
  sm: { container: 'h-5 w-7 rounded-sm', text: 'text-[9px]' },
  md: { container: 'h-6 w-9 rounded-sm', text: 'text-[10px]' },
  lg: { container: 'h-7 w-10 rounded-md', text: 'text-xs' },
};

/**
 * Minimal country flag visual: two stacked stripes + the 3-letter code.
 * Uses the country's `stripe` (top) and `accent` (bottom) colors from DB.
 * Real SVG flags can replace this in Fase 7 polish.
 */
export function FlagDot({ code, color = '#9CA3AF', accentColor, size = 'md', className }: Props) {
  const sz = sizeStyles[size];
  return (
    <View
      className={cn('overflow-hidden items-center justify-center', sz.container, className)}
      style={{ backgroundColor: color }}
    >
      {accentColor && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40%',
            backgroundColor: accentColor,
          }}
        />
      )}
      <Text className={cn('font-sans-bold text-white', sz.text)}>{code}</Text>
    </View>
  );
}
