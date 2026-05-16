import { Pressable, ScrollView, View } from 'react-native';
import { cn } from '@/shared/lib/cn';
import { Text } from '@/shared/ui';

type Country = { code: string; name: string; flag: string; accent: string };

type Props = {
  countries: Country[];
  active: string;
  onChange: (code: string) => void;
};

function Chip({
  active,
  onPress,
  children,
}: {
  active?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'h-9 flex-row items-center gap-1.5 rounded-full border px-3',
        active
          ? 'bg-ink-900 border-ink-900 active:opacity-90'
          : 'bg-white border-ink-100 active:bg-cream-200',
      )}
    >
      {children}
    </Pressable>
  );
}

export function CountriesBar({ countries, active, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingRight: 16 }}
    >
      <Chip active={active === 'ALL'} onPress={() => onChange('ALL')}>
        <Text className="text-base">🌎</Text>
        <Text className={cn('text-sm font-semibold', active === 'ALL' ? 'text-cream' : 'text-ink-900')}>
          ALL
        </Text>
      </Chip>
      {countries.map((c) => {
        const isActive = active === c.code;
        return (
          <Chip key={c.code} active={isActive} onPress={() => onChange(c.code)}>
            <Text className="text-base">{c.flag}</Text>
            <Text className={cn('text-sm font-semibold', isActive ? 'text-cream' : 'text-ink-900')}>
              {c.code}
            </Text>
          </Chip>
        );
      })}
      <View style={{ width: 4 }} />
    </ScrollView>
  );
}
