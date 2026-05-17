import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { CheckIcon } from '@/ui/icons/Glyphs';

import { universities, type University } from '../lib/universities';

type Props = {
  ownUniversity: University | null;
  value: string[];
  onChange: (next: string[]) => void;
};

/**
 * Selector minimalista al estilo iOS Settings / Linear:
 *   - Sin cajas con borde
 *   - Sección con label uppercase + hairlines (1px) entre filas
 *   - Selección con un check sutil del color de la uni
 *   - La universidad propia está siempre presente y no se puede quitar
 */
export function ScopePicker({ ownUniversity, value, onChange }: Props) {
  const toggle = (id: string) => {
    if (ownUniversity?.id === id) return;
    const next = value.includes(id) ? value.filter((x) => x !== id) : [...value, id];
    onChange(next);
  };

  const others = universities.filter((u) => u.id !== ownUniversity?.id);

  return (
    <View>
      {ownUniversity && (
        <View className="mb-7">
          <SectionLabel>Tu universidad</SectionLabel>
          <Row
            uni={ownUniversity}
            selected
            locked
            isLast
          />
        </View>
      )}

      <View>
        <SectionLabel>También quiero ver</SectionLabel>
        {others.map((u, i) => (
          <Row
            key={u.id}
            uni={u}
            selected={value.includes(u.id)}
            isLast={i === others.length - 1}
            onPress={() => toggle(u.id)}
          />
        ))}
      </View>
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-2 text-[11px] font-sans-semibold uppercase tracking-[0.18em] text-text-tertiary">
      {children}
    </Text>
  );
}

type RowProps = {
  uni: University;
  selected: boolean;
  locked?: boolean;
  isLast: boolean;
  onPress?: () => void;
};

function Row({ uni, selected, locked, isLast, onPress }: RowProps) {
  const { colors } = useTheme();
  const accent = selected ? uni.color : colors.textTertiary;

  const inner = (
    <View
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
          minWidth: 52,
          fontSize: 13,
          fontWeight: '700',
          color: uni.color,
          letterSpacing: 0.3,
        }}
      >
        {uni.short}
      </Text>
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          color: colors.textPrimary,
        }}
        numberOfLines={1}
      >
        {uni.name}
      </Text>
      {locked ? (
        <Text
          style={{
            fontSize: 12,
            fontWeight: '500',
            color: colors.textTertiary,
            letterSpacing: 0.2,
          }}
        >
          Predeterminada
        </Text>
      ) : (
        <View style={{ width: 20, alignItems: 'flex-end' }}>
          {selected && <CheckIcon size={18} color={accent} strokeWidth={2.4} />}
        </View>
      )}
    </View>
  );

  if (locked || !onPress) return inner;
  return <Pressable onPress={onPress}>{inner}</Pressable>;
}
