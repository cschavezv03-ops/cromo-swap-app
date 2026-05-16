import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { ScopePicker } from '@/features/auth/components/ScopePicker';
import { UniversityBadge } from '@/features/auth/components/UniversityBadge';
import { useUpdateProfile } from '@/features/auth/hooks/useAuthMutations';
import { useSession } from '@/features/auth/hooks/useSession';
import { detectUniversityFromEmail } from '@/features/auth/lib/universities';
import { Button, Input, Screen, useToast } from '@/ui';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useSession();
  const updateProfile = useUpdateProfile();

  const detectedUni = useMemo(() => detectUniversityFromEmail(user?.email ?? ''), [user?.email]);
  const [displayName, setDisplayName] = useState('');
  const [scopeIds, setScopeIds] = useState<string[]>(detectedUni ? [detectedUni.id] : []);

  const onSubmit = async () => {
    const name = displayName.trim();
    if (name.length < 2) {
      toast.show('Tu nombre debe tener al menos 2 caracteres.', 'warning');
      return;
    }
    if (!detectedUni) {
      toast.show(
        'No se pudo detectar tu universidad del correo. Regresa y vuelve a ingresar un correo institucional.',
        'danger',
      );
      return;
    }
    if (scopeIds.length === 0) {
      toast.show('Elige al menos una universidad para tu scope.', 'warning');
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
        err instanceof Error ? err.message : 'No se pudo guardar tu perfil.',
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
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}>
          <Text className="text-xs font-sans-semibold uppercase tracking-[0.18em] text-text-tertiary">
            Último paso
          </Text>
          <Text className="mt-2 text-3xl font-sans-black text-text-primary">
            Cuéntanos quién eres
          </Text>
          <Text className="mt-3 text-base text-text-secondary font-sans">
            Esto es lo que ven otros usuarios cuando apareces en un match.
          </Text>

          <View className="mt-8 gap-5">
            <Input
              label="Nombre completo"
              placeholder="ej. María Pérez"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              value={displayName}
              onChangeText={setDisplayName}
            />

            <View>
              <Text className="mb-2 text-[11px] font-sans-semibold uppercase tracking-[0.15em] text-text-tertiary">
                Tu correo institucional
              </Text>
              <View className="rounded-lg border border-border bg-surface px-4 py-3">
                <Text className="font-sans text-text-primary">{user?.email}</Text>
              </View>
              <Text className="mt-2 text-xs text-text-tertiary font-sans">
                Tu universidad se detecta del dominio del correo y no se puede editar.
              </Text>
            </View>

            <ScopePicker
              ownUniversity={detectedUni}
              value={scopeIds}
              onChange={setScopeIds}
            />
          </View>

          <View className="mt-8">
            <Button
              label="Empezar"
              size="lg"
              loading={updateProfile.isPending}
              disabled={displayName.trim().length < 2 || updateProfile.isPending}
              onPress={onSubmit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
