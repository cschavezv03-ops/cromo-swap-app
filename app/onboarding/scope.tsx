import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Screen, Text } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useUniversities } from '@/features/onboarding/data/universities';
import { useSetScope } from '@/features/onboarding/data/mutations';
import { useSession } from '@/features/session/SessionProvider';

export default function ScopeStep() {
  const router = useRouter();
  const { user, profile } = useSession();
  const { data: list = [] } = useUniversities();
  const setScope = useSetScope();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(profile?.scope ?? (profile?.university ? [profile.university] : [])),
  );

  const data = useMemo(() => list, [list]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (!user?.id || selected.size === 0) return;
    try {
      await setScope.mutateAsync({ userId: user.id, scope: Array.from(selected) });
      router.replace('/(tabs)/album');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No pudimos guardar tu scope';
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
          <Text variant="overline">Paso 4 de 4</Text>
          <Text variant="h1" className="mt-2">
            ¿Con qué universidades querés intercambiar?
          </Text>
          <Text variant="bodySm" className="mt-2">
            Podés elegir solo la tuya o sumar varias. Esto controla qué perfiles, ventas y subastas vas a ver.
          </Text>
        </View>
        <FlatList
          data={data}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
          renderItem={({ item }) => {
            const active = selected.has(item.id);
            return (
              <Pressable
                onPress={() => toggle(item.id)}
                className={cn(
                  'flex-row items-center gap-3 rounded-2xl border px-4 py-4',
                  active
                    ? 'border-verde-700 bg-verde-100'
                    : 'border-ink-100 bg-white active:bg-cream-200',
                )}
              >
                <View
                  style={{ backgroundColor: item.color }}
                  className="h-10 w-10 items-center justify-center rounded-xl"
                >
                  <Text className="text-xs font-bold text-white">{item.short}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-ink-900">{item.name}</Text>
                </View>
                <View
                  className={cn(
                    'h-6 w-6 items-center justify-center rounded-full border',
                    active ? 'border-verde-700 bg-verde-700' : 'border-ink-200 bg-white',
                  )}
                >
                  {active ? <Text className="text-xs font-bold text-cream">✓</Text> : null}
                </View>
              </Pressable>
            );
          }}
        />
        <Button
          label={`Continuar${selected.size > 0 ? ` (${selected.size})` : ''}`}
          size="lg"
          disabled={selected.size === 0}
          loading={setScope.isPending}
          onPress={submit}
        />
      </View>
    </Screen>
  );
}
