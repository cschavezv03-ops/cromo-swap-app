import { View, type ViewProps } from 'react-native';
import { cn } from '@/shared/lib/cn';

type Props = ViewProps & { className?: string };

export function Card({ className, ...props }: Props) {
  return (
    <View
      className={cn('bg-white rounded-2xl border border-ink-100 p-4', className)}
      {...props}
    />
  );
}
