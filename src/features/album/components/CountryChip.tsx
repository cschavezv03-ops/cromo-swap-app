import { Pressable, View } from 'react-native';
import { cn } from '@/shared/lib/cn';
import { Text } from '@/shared/ui';

type Props = {
  flag: string;
  code: string;
  active?: boolean;
  onPress?: () => void;
};

export function CountryChip({ flag, code, active, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'h-9 flex-row items-center gap-2 rounded-full border px-3.5',
        active
          ? 'bg-ink-900 border-ink-900 active:opacity-90'
          : 'bg-white border-ink-100 active:bg-cream-200',
      )}
    >
      <Text className="text-base">{flag}</Text>
      <Text className={cn('text-sm font-semibold', active ? 'text-cream' : 'text-ink-900')}>
        {code}
      </Text>
    </Pressable>
  );
}

export function AllChip({ active, onPress }: { active?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'h-9 flex-row items-center gap-2 rounded-full border px-3.5',
        active
          ? 'bg-ink-900 border-ink-900 active:opacity-90'
          : 'bg-white border-ink-100 active:bg-cream-200',
      )}
    >
      <View
        className={cn(
          'h-5 w-5 items-center justify-center rounded-full',
          active ? 'bg-verde-300' : 'bg-verde-100',
        )}
      >
        <Text className="text-xs">🌎</Text>
      </View>
      <Text className={cn('text-sm font-semibold', active ? 'text-cream' : 'text-ink-900')}>
        ALL
      </Text>
    </Pressable>
  );
}
