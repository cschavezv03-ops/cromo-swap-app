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
 * Selector de universidades (scope). Diseño:
 *   - Card explicativa arriba: qué es scope y para qué sirve
 *   - Botón "Seleccionar todas / Ninguna" para acción masiva
 *   - Universidad propia chip permanente con label "Predeterminada"
 *   - Otras 7 universidades con tap toggle, ícono check visible cuando activa
 */
export function ScopePicker({ ownUniversity, value, onChange }: Props) {
  const { colors } = useTheme();
  const others = universities.filter((u) => u.id !== ownUniversity?.id);
  const otherIds = others.map((u) => u.id);

  // Solo cuentan las "otras" para el toggle masivo — la propia siempre on
  const allOthersOn = otherIds.every((id) => value.includes(id));
  const selectedCount = value.filter((v) => v !== ownUniversity?.id).length;

  const toggle = (id: string) => {
    if (ownUniversity?.id === id) return;
    const next = value.includes(id) ? value.filter((x) => x !== id) : [...value, id];
    onChange(next);
  };

  const toggleAll = () => {
    if (allOthersOn) {
      onChange(ownUniversity ? [ownUniversity.id] : []);
    } else {
      onChange([...(ownUniversity ? [ownUniversity.id] : []), ...otherIds]);
    }
  };

  return (
    <View>
      {/* Card explicativa */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: 16,
          marginBottom: 18,
        }}
      >
        <Text
          className="font-sans-semibold uppercase tracking-[0.18em] text-text-tertiary"
          style={{ fontSize: 11 }}
        >
          ¿Qué es tu scope?
        </Text>
        <Text
          className="mt-2 font-sans text-text-secondary"
          style={{ fontSize: 14, lineHeight: 20 }}
        >
          El scope son las <Text className="font-sans-bold text-text-primary">universidades de las que verás gente</Text>{' '}
          y publicaciones. Tu propia universidad está incluida siempre. Marcá las otras donde
          también querés intercambiar.
        </Text>
        <Text
          className="mt-3 font-sans text-text-tertiary"
          style={{ fontSize: 12, lineHeight: 18 }}
        >
          Mientras más amplio el scope, más cromos encontrarás — pero también más gente verá tu
          perfil.
        </Text>
      </View>

      {/* Universidad propia */}
      {ownUniversity && (
        <View className="mb-7">
          <SectionLabel>Tu universidad</SectionLabel>
          <Row uni={ownUniversity} selected locked isLast />
        </View>
      )}

      {/* Otras unis con toggle masivo */}
      <View>
        <View className="mb-2 flex-row items-baseline justify-between">
          <SectionLabel>
            También quiero ver{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </SectionLabel>
          <Pressable onPress={toggleAll} hitSlop={6}>
            <Text
              className="font-sans-semibold text-accent"
              style={{ fontSize: 12, letterSpacing: 0.2 }}
            >
              {allOthersOn ? 'Quitar todas' : 'Seleccionar todas'}
            </Text>
          </Pressable>
        </View>
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
    <Text className="text-[11px] font-sans-semibold uppercase tracking-[0.18em] text-text-tertiary">
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
