import { SafeAreaView, type SafeAreaViewProps } from 'react-native-safe-area-context';
import { cn } from '@/shared/lib/cn';

type Props = SafeAreaViewProps & { className?: string };

export function Screen({ className, edges = ['top', 'left', 'right'], ...props }: Props) {
  return (
    <SafeAreaView
      edges={edges}
      className={cn('flex-1 bg-cream', className)}
      {...props}
    />
  );
}
