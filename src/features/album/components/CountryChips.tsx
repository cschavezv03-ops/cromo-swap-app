import { ScrollView } from 'react-native';

import { Chip } from '@/ui';
import { GlobeIcon } from '@/ui/icons/Glyphs';
import { useTheme } from '@/theme/ThemeProvider';

import { SPECIAL_SECTIONS } from '../lib/sections';
import type { CountryMeta } from '../lib/types';

import { SectionMark } from './SectionMark';

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
const SPECIAL_LABELS: Record<(typeof SPECIAL_ORDER)[number], string> = {
  FWC: 'Intro',
  MUSEUM: 'Museum',
  COCA: 'Coca-Cola',
  EXTRA: 'Extra',
};

export function CountryChips({ countries, selected, onToggle, onClear }: Props) {
  const { colors } = useTheme();
  const allSelected = selected.length === 0;
  const allChipColor = allSelected ? colors.bg : colors.textSecondary;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
    >
      <Chip
        label="Todos"
        variant={allSelected ? 'selected' : 'default'}
        leftSlot={<GlobeIcon size={14} color={allChipColor} />}
        onPress={onClear}
      />

      {/* Especiales primero */}
      {SPECIAL_ORDER.map((code) => {
        const meta = SPECIAL_SECTIONS[code]!;
        const isOn = selected.includes(code);
        return (
          <Chip
            key={code}
            label={SPECIAL_LABELS[code]}
            variant={isOn ? 'selected' : 'default'}
            leftSlot={<SectionMark country={meta} size="sm" />}
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
            leftSlot={<SectionMark country={c} size="sm" />}
            onPress={() => onToggle(c.code)}
          />
        );
      })}
    </ScrollView>
  );
}
