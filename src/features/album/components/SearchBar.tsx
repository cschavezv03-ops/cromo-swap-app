import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  /** Valor controlado externamente. */
  value: string;
  /** Llamado con el valor debounced. */
  onChange: (next: string) => void;
  /** ms de debounce antes de emitir `onChange`. Default 200ms. */
  debounceMs?: number;
  placeholder?: string;
  /** Modo embebido (no-floating): sin padding extra. */
  compact?: boolean;
  autoFocus?: TextInputProps['autoFocus'];
};

/**
 * Buscador minimalista con debounce. Reacciona al input local de inmediato
 * (ux fluida) y emite el valor estabilizado tras `debounceMs` para que el
 * filtro/refetch no se dispare en cada keystroke.
 */
export function SearchBar({
  value,
  onChange,
  debounceMs = 200,
  placeholder = 'Buscar cromo, jugador, país o número…',
  compact = false,
  autoFocus,
}: Props) {
  const { colors } = useTheme();
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Si el valor externo cambia (ej. limpiar filtros), sincronizamos.
  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleChange = (next: string) => {
    setLocal(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onChange(next);
    }, debounceMs);
  };

  const handleClear = () => {
    setLocal('');
    if (timer.current) clearTimeout(timer.current);
    onChange('');
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
        borderRadius: 999,
        backgroundColor: colors.surface,
        paddingHorizontal: 14,
        marginHorizontal: compact ? 0 : 20,
      }}
    >
      <Text
        style={{
          fontSize: 15,
          color: colors.textTertiary,
          marginRight: 10,
        }}
      >
        🔍
      </Text>
      <TextInput
        value={local}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        autoFocus={autoFocus}
        style={{
          flex: 1,
          fontSize: 14,
          color: colors.textPrimary,
          padding: 0,
        }}
      />
      {local.length > 0 && (
        <Pressable
          onPress={handleClear}
          hitSlop={8}
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: colors.borderStrong,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 12,
              lineHeight: 14,
              color: colors.bg,
              fontWeight: '700',
            }}
          >
            ×
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// Para que TS no se queje de la importación de StyleSheet sin uso.
StyleSheet.create({});
