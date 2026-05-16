import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { cn } from '@/shared/utils/cn';

type Props = {
  children: ReactNode;
  edges?: ReadonlyArray<Edge>;
  className?: string;
  scrollable?: boolean;
};

export function Screen({ children, edges = ['top', 'bottom'], className }: Props) {
  return (
    <SafeAreaView edges={edges} className={cn('flex-1 bg-bg', className)}>
      <View className="flex-1">{children}</View>
    </SafeAreaView>
  );
}
