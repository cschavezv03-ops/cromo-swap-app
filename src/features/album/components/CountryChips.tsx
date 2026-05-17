import { ScrollView, Text, View } from 'react-native';

import { Chip, FlagDot } from '@/ui';

import { SPECIAL_SECTIONS } from '../lib/sections';
import type { CountryMeta } from '../lib/types';

type Props = {
  countries: CountryMeta[];
  selected: string[];
  onToggle: (code: string) => void;
  onClear: () => void;
};

const SPECIAL_ORDER = ['FWC', 'MUSEUM', 'COCA', 'EXTRA'] as const;

/**
 * Tira horizontal de filtros por sección.
 *
 * Layout:
 *   [ ALL ]  ·  [ FWC ] [ MUSEUM ] [ COCA ] [ EXTRA ]  ·  [ ARG ] [ BRA ] ...
 *
 * Las 4 secciones especiales van primero (con sus colores/emoji) para que
 * sea fácil ver solo "Coca-Cola" o solo "Extra Stickers". Después siguen
 * los 48 países en el mismo orden que devuelve `countries`.
 */
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

      {/* Especiales primero */}
      {SPECIAL_ORDER.map((code) => {
        const meta = SPECIAL_SECTIONS[code]!;
        const isOn = selected.includes(code);
        return (
          <Chip
            key={code}
            label={meta.flag_emoji + '  ' + (code === 'COCA' ? 'Coca-Cola' : code === 'EXTRA' ? 'Extra' : code === 'MUSEUM' ? 'Museum' : 'Intro')}
            variant={isOn ? 'selected' : 'default'}
            onPress={() => onToggle(code)}
          />
        );
      })}

      {/* Países */}
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
