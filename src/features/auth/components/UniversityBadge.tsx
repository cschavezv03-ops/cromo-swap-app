import { Text, View } from 'react-native';

import { cn } from '@/shared/utils/cn';

import type { University } from '../lib/universities';

type Props = {
  university: University | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeStyles = {
  sm: { container: 'h-7 px-2.5', text: 'text-[10px]', short: 'text-xs' },
  md: { container: 'h-9 px-3', text: 'text-xs', short: 'text-sm' },
  lg: { container: 'h-11 px-4', text: 'text-sm', short: 'text-base' },
};

export function UniversityBadge({ university, size = 'md', className }: Props) {
  const sz = sizeStyles[size];
  if (!university) {
    return (
      <View
        className={cn(
          'flex-row items-center rounded-pill border border-border bg-surface',
          sz.container,
          className,
        )}
      >
        <Text className={cn('text-text-tertiary font-sans-medium', sz.text)}>
          Universidad no detectada
        </Text>
      </View>
    );
  }
  return (
    <View
      className={cn('flex-row items-center gap-2 rounded-pill', sz.container, className)}
      style={{ backgroundColor: `${university.color}1A` }}
    >
      <View
        style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: university.color }}
      />
      <Text className={cn('font-sans-bold', sz.short)} style={{ color: university.color }}>
        {university.short}
      </Text>
      <Text className={cn('text-text-secondary font-sans', sz.text)}>{university.name}</Text>
    </View>
  );
}
