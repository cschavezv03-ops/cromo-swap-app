import { ScrollView, Text, View } from 'react-native';

import { Chip, FlagDot } from '@/ui';

import type { CountryMeta } from '../lib/types';

type Props = {
  countries: CountryMeta[];
  selected: string[];
  onToggle: (code: string) => void;
  onClear: () => void;
};

export function CountryChips({ countries, selected, onToggle, onClear }: Props) {
  const allSelected = selected.length === 0;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
    >
      <Chip
        label="ALL"
        variant={allSelected ? 'selected' : 'default'}
        leftSlot={
          <View
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 12 }}>🌐</Text>
          </View>
        }
        onPress={onClear}
      />
      {countries.map((c) => {
        const isOn = selected.includes(c.code);
        return (
          <Chip
            key={c.code}
            label={c.code}
            variant={isOn ? 'selected' : 'default'}
            leftSlot={
              <FlagDot code={c.code} color={c.stripe} accentColor={c.accent} size="sm" />
            }
            onPress={() => onToggle(c.code)}
          />
        );
      })}
    </ScrollView>
  );
}
