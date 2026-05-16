import { Pressable, type PressableProps, View } from 'react-native';
import { cn } from '@/shared/lib/cn';
import { Text } from './Text';

type Props = Omit<PressableProps, 'children'> & {
  label: string;
  count?: number;
  active?: boolean;
  className?: string;
  leftEl?: React.ReactNode;
};

export function Pill({ label, count, active, className, leftEl, ...rest }: Props) {
  return (
    <Pressable
      className={cn(
        'h-9 flex-row items-center gap-2 rounded-full px-3.5 border',
        active
          ? 'bg-ink-900 border-ink-900 active:opacity-90'
          : 'bg-white border-ink-100 active:bg-cream-200',
        className,
      )}
      {...rest}
    >
      {leftEl ? <View>{leftEl}</View> : null}
      <Text
        className={cn(
          'text-sm font-semibold',
          active ? 'text-cream' : 'text-ink-900',
        )}
      >
        {label}
      </Text>
      {typeof count === 'number' ? (
        <Text
          className={cn(
            'text-sm font-semibold',
            active ? 'text-cream/70' : 'text-ink-400',
          )}
        >
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}
