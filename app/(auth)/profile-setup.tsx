import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { ScopePicker } from '@/features/auth/components/ScopePicker';
import { useUpdateProfile } from '@/features/auth/hooks/useAuthMutations';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { useSession } from '@/features/auth/hooks/useSession';
import { detectUniversityFromEmail } from '@/features/auth/lib/universities';
import { LEGAL_VERSION } from '@/features/legal/content';
import { identify, track } from '@/lib/observability';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Input, Screen, ThemePicker, useToast } from '@/ui';
import { CheckIcon } from '@/ui/icons/Glyphs';

// Placeholder genérico que mete el trigger handle_new_user al crear cuenta.
// Si el user trae este display_name, NO lo pre-popula: lo forzamos a escribir
// su nombre real.
const DEFAULT_TRIGGER_NAME = 'Usuario';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const { user } = useSession();
  const profileQuery = useProfile();
  const updateProfile = useUpdateProfile();

  const detectedUni = useMemo(() => detectUniversityFromEmail(user?.email ?? ''), [user?.email]);
  const [displayName, setDisplayName] = useState('');
  const [scopeIds, setScopeIds] = useState<string[]>(detectedUni ? [detectedUni.id] : []);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Pre-popular formulario con los datos que ya tenga el profile (caso
  // re-entry: user existente que debe re-aceptar términos por bump de
  // versión legal, o que quedó a medias en signup anterior).
  useEffect(() => {
    if (hydrated || profileQuery.isPending) return;
    const p = profileQuery.data;
    if (p) {
      if (p.display_name && p.display_name !== DEFAULT_TRIGGER_NAME) {
        setDisplayName(p.display_name);
      }
      if (p.scope && p.scope.length > 0) {
        setScopeIds(p.scope);
      }
    }
    setHydrated(true);
  }, [profileQuery.isPending, profileQuery.data, hydrated]);

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
    if (!termsAccepted) {
      toast.show('Debes aceptar los Términos y la Política de Privacidad.', 'warning');
      return;
    }
    try {
      await updateProfile.mutateAsync({
        display_name: name,
        university: detectedUni.id,
        scope: scopeIds,
        termsAcceptedVersion: LEGAL_VERSION,
      });
      if (user?.id) {
        identify(user.id, {
          set: { display_name: name, university: detectedUni.id },
          setOnce: { signup_date: new Date().toISOString() },
        });
      }
      track('profile_created', {
        university: detectedUni.id,
        scope_count: scopeIds.length,
        legal_version: LEGAL_VERSION,
      });
      router.replace('/(app)/(tabs)/album');
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'No se pudo guardar tu perfil.', 'danger');
    }
  };

  const canSubmit =
    displayName.trim().length >= 2 &&
    scopeIds.length > 0 &&
    termsAccepted &&
    !updateProfile.isPending;

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 32,
            paddingBottom: 40,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="font-sans-semibold text-[11px] uppercase tracking-[0.2em] text-text-tertiary">
            Último paso
          </Text>
          <Text className="mt-2 font-sans-black text-[32px] leading-[36px] text-text-primary">
            Cuéntanos quién eres
          </Text>
          <Text className="mt-3 font-sans text-[15px] leading-[22px] text-text-secondary">
            Esto es lo que ven otros usuarios cuando apareces en un match.
          </Text>

          <View className="mt-10">
            <Input
              label="Nombre completo"
              placeholder="ej. María Pérez"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>

          <View className="mt-7">
            <Text className="mb-2 font-sans-semibold text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
              Tu correo
            </Text>
            <View className="flex-row items-baseline">
              <Text className="flex-1 font-sans text-[16px] text-text-primary" numberOfLines={1}>
                {user?.email}
              </Text>
              {detectedUni && (
                <Text
                  className="ml-3 font-sans-bold text-[13px]"
                  style={{ color: detectedUni.color, letterSpacing: 0.3 }}
                >
                  {detectedUni.short}
                </Text>
              )}
            </View>
            <Text className="mt-1.5 font-sans text-[12px] text-text-tertiary">
              Tu universidad se detecta automáticamente del dominio.
            </Text>
          </View>

          <View className="mt-9">
            <ScopePicker ownUniversity={detectedUni} value={scopeIds} onChange={setScopeIds} />
          </View>

          <View className="mt-9">
            <ThemePicker />
          </View>

          {/* Aceptación de Términos */}
          <View className="mt-9">
            <Pressable
              onPress={() => setTermsAccepted((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: termsAccepted }}
              style={{ flexDirection: 'row', alignItems: 'flex-start' }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: termsAccepted ? colors.accent : colors.borderStrong,
                  backgroundColor: termsAccepted ? colors.accent : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 2,
                  marginRight: 12,
                }}
              >
                {termsAccepted && <CheckIcon size={14} color={colors.bg} strokeWidth={3} />}
              </View>
              <Text
                className="flex-1 font-sans text-[13px] text-text-secondary"
                style={{ lineHeight: 19 }}
              >
                Soy mayor de 18 años y acepto los{' '}
                <Text
                  className="font-sans-semibold text-accent"
                  onPress={() => router.push('/legal/terms')}
                >
                  Términos
                </Text>{' '}
                y la{' '}
                <Text
                  className="font-sans-semibold text-accent"
                  onPress={() => router.push('/legal/privacy')}
                >
                  Política de Privacidad
                </Text>
                . Consiento que mis datos se transfieran a Estados Unidos para el funcionamiento del
                servicio.
              </Text>
            </Pressable>
          </View>

          <View className="mt-8">
            <Button
              label="Empezar"
              size="lg"
              loading={updateProfile.isPending}
              disabled={!canSubmit}
              onPress={onSubmit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
