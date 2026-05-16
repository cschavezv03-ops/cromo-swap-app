import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeMode } from '@/theme/tokens';

type Option = {
  key: 'system' | 'light' | 'dark';
  label: string;
  hint: string;
  glyph: string;
};

const OPTIONS: Option[] = [
  { key: 'system', label: 'Sistema', hint: 'Sigue tu Android',     glyph: '◐' },
  { key: 'light',  label: 'Claro',   hint: 'Fondo blanco',         glyph: '☀' },
  { key: 'dark',   label: 'Oscuro',  hint: 'Negro, ahorra batería', glyph: '☾' },
];

type Props = {
  /** Cuando true (default), muestra el label "APARIENCIA" arriba. */
  showLabel?: boolean;
};

export function ThemePicker({ showLabel = true }: Props) {
  const { override, setOverride, mode, colors } = useTheme();

  const apply = (k: Option['key']) => {
    if (k === 'system') setOverride(null);
    else setOverride(k as ThemeMode);
  };

  const current: Option['key'] = override ?? 'system';

  return (
    <View>
      {showLabel && (
        <Text className="mb-2 text-[11px] font-sans-semibold uppercase tracking-[0.18em] text-text-tertiary">
          Apariencia
        </Text>
      )}
      {OPTIONS.map((opt, i) => {
        const isSelected = opt.key === current;
        const isLast = i === OPTIONS.length - 1;
        const tintWhenSelected = opt.key === 'system' ? colors.accent : colors.textPrimary;
        return (
          <Pressable
            key={opt.key}
            onPress={() => apply(opt.key)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 14,
              borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            }}
          >
            <Text
              style={{
                width: 28,
                fontSize: 18,
                color: isSelected ? tintWhenSelected : colors.textTertiary,
              }}
            >
              {opt.glyph}
            </Text>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: colors.textPrimary,
                }}
              >
                {opt.label}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>
                {opt.key === 'system' ? `${opt.hint} (actualmente: ${mode === 'dark' ? 'oscuro' : 'claro'})` : opt.hint}
              </Text>
            </View>
            {isSelected && (
              <Text style={{ fontSize: 18, color: tintWhenSelected, fontWeight: '700' }}>✓</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
