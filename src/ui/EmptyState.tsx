import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { cn } from '@/shared/utils/cn';

type Props = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: Props) {
  return (
    <View className={cn('flex-1 items-center justify-center px-8 py-12', className)}>
      {icon && <View className="mb-4">{icon}</View>}
      <Text className="text-text-primary text-lg font-sans-bold text-center">{title}</Text>
      {description && (
        <Text className="mt-2 text-text-secondary text-base font-sans text-center">
          {description}
        </Text>
      )}
      {action && <View className="mt-6">{action}</View>}
    </View>
  );
}
