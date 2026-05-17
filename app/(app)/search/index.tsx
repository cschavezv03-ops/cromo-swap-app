import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { universities, universitiesById } from '@/features/auth/lib/universities';
import { useSearchProfiles } from '@/features/profile/hooks/useSearchProfiles';
import { track } from '@/lib/observability';
import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, EmptyState, Screen, ScreenHeader, Skeleton } from '@/ui';

export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [uni, setUni] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const q = input.trim();
      setDebounced(q);
      if (q.length >= 2 || uni) {
        track('user_search', { has_query: q.length >= 2, has_university: Boolean(uni) });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [input, uni]);

  const search = useSearchProfiles(debounced, uni);
  const results = search.data ?? [];
  const hasQuery = debounced.length >= 2 || Boolean(uni);

  return (
    <Screen>
      <ScreenHeader title="Buscar personas" onBack={() => router.back()} />

      <View className="px-5 pb-3">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            height: 44,
            borderRadius: 12,
            backgroundColor: colors.surface,
          }}
        >
          <Text style={{ color: colors.textTertiary, fontSize: 15, marginRight: 8 }}>
            ⌕
          </Text>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Nombre de la persona…"
            placeholderTextColor={colors.textTertiary}
            style={{ flex: 1, color: colors.textPrimary, fontSize: 15 }}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            autoFocus
          />
          {input.length > 0 && (
            <Pressable onPress={() => setInput('')} hitSlop={8}>
              <Text style={{ color: colors.textTertiary, fontSize: 15 }}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View className="pb-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          <UniChip
            label="Todas"
            active={uni === null}
            onPress={() => setUni(null)}
          />
          {universities.map((u) => (
            <UniChip
              key={u.id}
              label={u.short}
              color={u.color}
              active={uni === u.id}
              onPress={() => setUni(uni === u.id ? null : u.id)}
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {!hasQuery && (
          <View className="px-8 pt-12">
            <Text className="text-center text-sm font-sans text-text-tertiary">
              Escribí al menos 2 letras o tocá una universidad para empezar.
            </Text>
          </View>
        )}

        {hasQuery && search.isLoading && (
          <View className="gap-2 px-5 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={56} rounded="md" />
            ))}
          </View>
        )}

        {hasQuery && !search.isLoading && results.length === 0 && (
          <EmptyState
            title="Sin resultados"
            description="Probá con otro nombre o cambia la universidad."
          />
        )}

        {results.map((p) => {
          const u = p.university ? universitiesById[p.university] : null;
          return (
            <Pressable
              key={p.id}
              onPress={() =>
                router.push({
                  pathname: '/(app)/profile/[id]',
                  params: { id: p.id },
                })
              }
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              }}
            >
              <Avatar url={p.avatar_url} name={p.display_name} size={44} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View className="flex-row items-center gap-2">
                  <Text
                    className="text-base font-sans-semibold text-text-primary"
                    numberOfLines={1}
                  >
                    {p.display_name}
                  </Text>
                  {p.is_friend && (
                    <Text className="text-[11px] font-sans-semibold text-success">
                      ✓ Amigo
                    </Text>
                  )}
                </View>
                <View className="mt-0.5 flex-row items-center gap-2">
                  {u && (
                    <Text
                      className="text-xs font-sans-semibold"
                      style={{ color: u.color }}
                    >
                      {u.short}
                    </Text>
                  )}
                  {typeof p.album_pct === 'number' && (
                    <Text className="text-xs font-sans-medium text-text-tertiary">
                      · {Math.round(p.album_pct)}% del álbum
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

function UniChip({
  label,
  color,
  active,
  onPress,
}: {
  label: string;
  color?: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const bg = active ? color ?? colors.accent : colors.surface;
  const textColor = active ? '#FFFFFF' : colors.textPrimary;
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: bg,
      }}
    >
      <Text
        style={{
          color: textColor,
          fontSize: 13,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
