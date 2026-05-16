import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { UniversityBadge } from '@/features/auth/components/UniversityBadge';
import { useUpdateProfile } from '@/features/auth/hooks/useAuthMutations';
import { useSession } from '@/features/auth/hooks/useSession';
import {
  detectUniversityFromEmail,
  universities,
} from '@/features/auth/lib/universities';
import { Button, Input, Screen, useToast } from '@/ui';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useSession();
  const updateProfile = useUpdateProfile();

  const detectedUni = useMemo(() => detectUniversityFromEmail(user?.email ?? ''), [user?.email]);
  const [displayName, setDisplayName] = useState('');
  const [scopeIds, setScopeIds] = useState<string[]>(detectedUni ? [detectedUni.id] : []);

  const toggleScope = (id: string) => {
    setScopeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const onSubmit = async () => {
    const name = displayName.trim();
    if (name.length < 2) {
      toast.show('Tu nombre debe tener al menos 2 caracteres.', 'warning');
      return;
    }
    if (!detectedUni) {
      toast.show(
        'No pudimos detectar tu universidad del correo. Volvé y reingresá un mail institucional.',
        'danger',
      );
      return;
    }
    if (scopeIds.length === 0) {
      toast.show('Elegí al menos una universidad para tu scope.', 'warning');
      return;
    }
    try {
      await updateProfile.mutateAsync({
        display_name: name,
        university: detectedUni.id,
        scope: scopeIds,
      });
      router.replace('/(app)/(tabs)/album');
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'No pudimos guardar tu perfil.',
        'danger',
      );
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 32 }}>
          <Text className="text-xs font-sans-semibold uppercase tracking-[0.18em] text-text-tertiary">
            Último paso
          </Text>
          <Text className="mt-2 text-3xl font-sans-black text-text-primary">
            Contanos quién sos
          </Text>
          <Text className="mt-3 text-base text-text-secondary font-sans">
            Esto es lo que ven los otros usuarios cuando aparezcas en un match.
          </Text>

          <View className="mt-8 gap-4">
            <Input
              label="Nombre y apellido"
              placeholder="ej. María Pérez"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              value={displayName}
              onChangeText={setDisplayName}
            />

            <View>
              <Text className="mb-2 text-xs font-sans-medium uppercase tracking-wider text-text-tertiary">
                Universidad
              </Text>
              <UniversityBadge university={detectedUni} size="lg" />
              <Text className="mt-2 text-xs text-text-tertiary font-sans">
                Tu universidad se detecta del dominio de tu correo y no se puede editar.
              </Text>
            </View>

            <View>
              <Text className="mb-2 text-xs font-sans-medium uppercase tracking-wider text-text-tertiary">
                Tu scope ({scopeIds.length})
              </Text>
              <Text className="mb-3 text-sm text-text-secondary font-sans">
                ¿Con qué universidades querés intercambiar?
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {universities.map((u) => {
                  const selected = scopeIds.includes(u.id);
                  const isOwn = detectedUni?.id === u.id;
                  return (
                    <Pressable
                      key={u.id}
                      onPress={() => toggleScope(u.id)}
                      className="rounded-pill border px-4 py-2"
                      style={{
                        borderColor: selected ? u.color : '#E5E5EA',
                        backgroundColor: selected ? `${u.color}20` : 'transparent',
                      }}
                    >
                      <Text
                        className="text-sm font-sans-semibold"
                        style={{ color: selected ? u.color : '#6E6E76' }}
                      >
                        {u.short}
                        {isOwn ? ' · vos' : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <View className="mt-10 pb-6">
            <Button
              label="Empezar"
              size="lg"
              loading={updateProfile.isPending}
              disabled={
                displayName.trim().length < 2 || scopeIds.length === 0 || updateProfile.isPending
              }
              onPress={onSubmit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
