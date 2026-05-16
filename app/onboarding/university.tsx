import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Screen, Text } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useUniversities } from '@/features/onboarding/data/universities';
import { useSetUniversity } from '@/features/onboarding/data/mutations';
import { useSession } from '@/features/session/SessionProvider';

export default function UniversityStep() {
  const router = useRouter();
  const { user, profile } = useSession();
  const { data: list = [], isLoading } = useUniversities();
  const setUniversity = useSetUniversity();
  const [selected, setSelected] = useState<string | null>(profile?.university ?? null);

  const data = useMemo(() => list, [list]);

  const submit = async () => {
    if (!user?.id || !selected) return;
    try {
      await setUniversity.mutateAsync({ userId: user.id, universityId: selected });
      router.replace('/');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No pudimos guardar tu universidad';
      Alert.alert('Ups', msg);
    }
  };

  return (
    <Screen>
      <View className="flex-1 px-6 pb-8 pt-6">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
          <Text className="text-2xl">‹</Text>
        </Pressable>
        <View className="mb-4 mt-2">
          <Text variant="overline">Paso 2 de 4</Text>
          <Text variant="h1" className="mt-2">
            ¿De qué universidad sos?
          </Text>
          <Text variant="bodySm" className="mt-2">
            Esto define con quién vas a poder intercambiar. Podés ampliar el alcance más adelante.
          </Text>
        </View>
        <FlatList
          data={data}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
          renderItem={({ item }) => {
            const active = selected === item.id;
            return (
              <Pressable
                onPress={() => setSelected(item.id)}
                className={cn(
                  'flex-row items-center gap-3 rounded-2xl border px-4 py-4',
                  active
                    ? 'border-ink-900 bg-ink-900'
                    : 'border-ink-100 bg-white active:bg-cream-200',
                )}
              >
                <View
                  style={{ backgroundColor: active ? '#F7F4ED' : item.color }}
                  className="h-10 w-10 items-center justify-center rounded-xl"
                >
                  <Text
                    style={{ color: active ? item.color : '#FFFFFF' }}
                    className="text-xs font-bold"
                  >
                    {item.short}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className={cn('text-base font-semibold', active ? 'text-cream' : 'text-ink-900')}>
                    {item.name}
                  </Text>
                  {item.email_domain ? (
                    <Text
                      className={cn(
                        'mt-0.5 text-xs',
                        active ? 'text-cream/70' : 'text-ink-500',
                      )}
                    >
                      @{item.email_domain}
                    </Text>
                  ) : null}
                </View>
                {active ? <Text className="text-cream text-lg">✓</Text> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            isLoading ? <Text variant="bodySm">Cargando universidades…</Text> : null
          }
        />
        <Button
          label="Continuar"
          size="lg"
          disabled={!selected}
          loading={setUniversity.isPending}
          onPress={submit}
        />
      </View>
    </Screen>
  );
}
