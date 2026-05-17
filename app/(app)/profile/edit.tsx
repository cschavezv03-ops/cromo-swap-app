import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { ScopePicker } from '@/features/auth/components/ScopePicker';
import { useUpdateProfile } from '@/features/auth/hooks/useAuthMutations';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { universitiesById } from '@/features/auth/lib/universities';
import { AvatarPicker } from '@/features/profile/components/AvatarPicker';
import { Button, Input, Screen, useToast } from '@/ui';

export default function ProfileEditScreen() {
  const router = useRouter();
  const toast = useToast();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const [displayName, setDisplayName] = useState('');
  const [scopeIds, setScopeIds] = useState<string[]>([]);

  // Cargar valores iniciales una vez que el profile resuelve.
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setScopeIds(profile.scope ?? []);
    }
  }, [profile]);

  const ownUni = profile?.university ? universitiesById[profile.university] ?? null : null;

  const onSubmit = async () => {
    const name = displayName.trim();
    if (name.length < 2) {
      toast.show('Tu nombre debe tener al menos 2 caracteres.', 'warning');
      return;
    }
    try {
      await updateProfile.mutateAsync({
        display_name: name,
        university: profile?.university ?? undefined,
        scope: scopeIds,
      });
      toast.show('Perfil actualizado.', 'success');
      router.back();
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
        <View className="flex-row items-center px-5 pt-2 pb-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="-ml-1 h-9 w-9 items-center justify-center rounded-md"
          >
            <Text className="text-text-primary text-xl">←</Text>
          </Pressable>
          <Text className="flex-1 text-center text-base font-sans-bold text-text-primary">
            Editar perfil
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 }}>
          <View className="items-center pb-6 pt-2">
            <AvatarPicker size={104} />
          </View>
          <View className="gap-5">
            <Input
              label="Nombre completo"
              placeholder="ej. María Pérez"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              value={displayName}
              onChangeText={setDisplayName}
            />

            <ScopePicker ownUniversity={ownUni} value={scopeIds} onChange={setScopeIds} />
          </View>

          <View className="mt-8">
            <Button
              label="Guardar cambios"
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
