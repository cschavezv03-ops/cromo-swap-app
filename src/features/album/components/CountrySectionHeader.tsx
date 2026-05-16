import { View } from 'react-native';
import { Text } from '@/shared/ui';

type Props = {
  flag: string;
  name: string;
  code: string;
  owned: number;
  total: number;
  accent: string;
};

export function CountrySectionHeader({ flag, name, code, owned, total, accent }: Props) {
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
  return (
    <View className="bg-cream pb-3 pt-5">
      <View className="flex-row items-center">
        <View className="flex-1 flex-row items-center gap-2">
          <Text className="text-2xl">{flag}</Text>
          <View>
            <Text className="text-lg font-bold text-ink-900">{name}</Text>
            <Text className="text-xs text-ink-500">
              {code} · {owned}/{total}
            </Text>
          </View>
        </View>
        <View className="h-1.5 w-20 overflow-hidden rounded-full bg-cream-300">
          <View
            style={{ width: `${pct}%`, backgroundColor: accent }}
            className="h-full rounded-full"
          />
        </View>
      </View>
    </View>
  );
}
