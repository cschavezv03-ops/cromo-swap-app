import { Pressable, Text, View } from 'react-native';

import { cn } from '@/shared/utils/cn';

import { universities, type University } from '../lib/universities';

type Props = {
  /** ID de la universidad propia del usuario; siempre incluida en el scope. */
  ownUniversity: University | null;
  /** Lista actual de universidades elegidas (incluye la propia). */
  value: string[];
  /** Devuelve la nueva lista (incluye la propia siempre). */
  onChange: (next: string[]) => void;
};

/**
 * UI limpia para elegir el "scope" de universidades con las que el usuario
 * quiere ver matches. La propia universidad está fija arriba y no se puede
 * deseleccionar (se garantiza siempre presente en el array).
 */
export function ScopePicker({ ownUniversity, value, onChange }: Props) {
  const toggle = (id: string) => {
    if (ownUniversity?.id === id) return; // la propia es obligatoria
    const next = value.includes(id) ? value.filter((x) => x !== id) : [...value, id];
    onChange(next);
  };

  const others = universities.filter((u) => u.id !== ownUniversity?.id);

  return (
    <View>
      {ownUniversity && (
        <View className="mb-5">
          <Text className="mb-2 text-[11px] font-sans-semibold uppercase tracking-[0.15em] text-text-tertiary">
            Tu universidad
          </Text>
          <View
            className="flex-row items-center gap-3 rounded-lg border bg-surface px-4 py-3"
            style={{ borderColor: ownUniversity.color, borderLeftWidth: 4 }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `${ownUniversity.color}1F`,
              }}
            >
              <Text className="font-sans-bold text-[12px]" style={{ color: ownUniversity.color }}>
                {ownUniversity.short}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-sans-bold text-text-primary text-base">
                {ownUniversity.name}
              </Text>
              <Text className="font-sans text-xs text-text-tertiary">
                Tu identidad en la app · No se puede quitar
              </Text>
            </View>
          </View>
        </View>
      )}

      <Text className="mb-2 text-[11px] font-sans-semibold uppercase tracking-[0.15em] text-text-tertiary">
        También quiero intercambiar con
      </Text>
      <View className="rounded-lg border border-border bg-surface-elev">
        {others.map((u, i) => {
          const isOn = value.includes(u.id);
          const isLast = i === others.length - 1;
          return (
            <Pressable
              key={u.id}
              onPress={() => toggle(u.id)}
              className={cn(
                'flex-row items-center gap-3 px-4 py-3',
                !isLast && 'border-b border-border',
              )}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isOn ? u.color : `${u.color}1F`,
                }}
              >
                <Text
                  className="font-sans-bold text-[11px]"
                  style={{ color: isOn ? '#FFFFFF' : u.color }}
                >
                  {u.short}
                </Text>
              </View>
              <View className="flex-1">
                <Text
                  className={cn(
                    'font-sans-semibold text-[15px]',
                    isOn ? 'text-text-primary' : 'text-text-secondary',
                  )}
                  numberOfLines={1}
                >
                  {u.name}
                </Text>
              </View>
              <Checkbox checked={isOn} accent={u.color} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Checkbox({ checked, accent }: { checked: boolean; accent: string }) {
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: checked ? accent : '#D1D1D6',
        backgroundColor: checked ? accent : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked && (
        <Text className="text-white text-[14px]" style={{ lineHeight: 14, marginTop: -2 }}>
          ✓
        </Text>
      )}
    </View>
  );
}
