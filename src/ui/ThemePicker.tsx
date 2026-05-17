import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeMode } from '@/theme/tokens';
import { CheckIcon, MoonIcon, SunIcon, SystemIcon } from '@/ui/icons/Glyphs';

type Option = {
  key: 'system' | 'light' | 'dark';
  label: string;
  hint: string;
  Icon: (props: { size?: number; color: string }) => React.ReactNode;
};

const OPTIONS: Option[] = [
  { key: 'system', label: 'Sistema', hint: 'Sigue tu Android',      Icon: SystemIcon },
  { key: 'light',  label: 'Claro',   hint: 'Fondo blanco',           Icon: SunIcon },
  { key: 'dark',   label: 'Oscuro',  hint: 'Negro, ahorra batería',  Icon: MoonIcon },
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
        const iconColor = isSelected ? tintWhenSelected : colors.textTertiary;
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
            <View style={{ width: 28, alignItems: 'flex-start' }}>
              <opt.Icon size={18} color={iconColor} />
            </View>
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
            {isSelected && <CheckIcon size={18} color={tintWhenSelected} strokeWidth={2.4} />}
          </Pressable>
        );
      })}
    </View>
  );
}
