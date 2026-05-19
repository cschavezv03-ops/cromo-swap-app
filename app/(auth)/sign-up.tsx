import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { UniversityBadge } from '@/features/auth/components/UniversityBadge';
import { useSignUpWithPassword } from '@/features/auth/hooks/useAuthMutations';
import { validatePassword } from '@/features/auth/lib/password';
import {
  allowedDomains,
  detectUniversityFromEmail,
  isValidInstitutionalEmail,
} from '@/features/auth/lib/universities';
import { track } from '@/lib/observability';
import { Button, Input, Screen, useToast } from '@/ui';

export default function SignUpScreen() {
  const router = useRouter();
  const toast = useToast();
  const signUp = useSignUpWithPassword();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touchedEmail, setTouchedEmail] = useState(false);

  const trimmed = email.trim().toLowerCase();
  const looksLikeEmail = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(trimmed);
  const validEmail = looksLikeEmail && isValidInstitutionalEmail(trimmed);
  const university = useMemo(() => detectUniversityFromEmail(trimmed), [trimmed]);
  const emailError =
    touchedEmail && trimmed.length > 0 && looksLikeEmail && !validEmail
      ? `Solo correos de: ${allowedDomains.join(', ')}`
      : undefined;

  const pwdValidation = useMemo(() => validatePassword(password), [password]);
  const showPwdIssues = password.length > 0 && !pwdValidation.ok;
  const mismatch = confirm.length > 0 && confirm !== password;

  const canSubmit =
    validEmail && pwdValidation.ok && password === confirm && !signUp.isPending;

  const onSubmit = async () => {
    setTouchedEmail(true);
    if (!canSubmit) return;
    try {
      await signUp.mutateAsync({ email: trimmed, password });
      track('signup_started', { university: university?.id ?? null });
      router.push({
        pathname: '/(auth)/verify',
        params: { email: trimmed, mode: 'signup' },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo crear la cuenta.';
      // Errores comunes de Supabase:
      // - "User already registered" → cuenta ya existe
      if (msg.toLowerCase().includes('already')) {
        toast.show('Esa cuenta ya existe. Probá iniciando sesión.', 'warning');
      } else {
        toast.show(msg, 'danger');
      }
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="-ml-1 mb-3 h-9 w-9 items-center justify-center"
          >
            <Text className="text-xl text-text-primary">←</Text>
          </Pressable>

          <Text className="font-sans-semibold text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
            Nueva cuenta
          </Text>
          <Text
            className="mt-2 font-sans-black text-text-primary"
            style={{ fontSize: 28, lineHeight: 34, letterSpacing: -0.6 }}
          >
            Empieza tu álbum
          </Text>
          <Text className="mt-3 font-sans text-text-secondary" style={{ fontSize: 15 }}>
            Tu correo institucional valida que eres parte de una universidad de Quito.
          </Text>

          <View className="mt-8 gap-4">
            <Input
              label="Correo institucional"
              placeholder="tu@usfq.edu.ec"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              onBlur={() => setTouchedEmail(true)}
              error={emailError}
            />
            <UniversityBadge university={university} />

            <Input
              label="Contraseña"
              placeholder="Mínimo 8 caracteres, letra y número"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              textContentType="newPassword"
              value={password}
              onChangeText={setPassword}
              helper={showPwdIssues ? `Falta: ${pwdValidation.messages.join(', ').toLowerCase()}` : undefined}
            />

            <Input
              label="Confirmar contraseña"
              placeholder="Repite la contraseña"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              textContentType="newPassword"
              value={confirm}
              onChangeText={setConfirm}
              error={mismatch ? 'Las contraseñas no coinciden' : undefined}
            />
          </View>

          <View className="mt-8">
            <Button
              label={signUp.isPending ? 'Creando cuenta…' : 'Crear cuenta'}
              size="lg"
              loading={signUp.isPending}
              disabled={!canSubmit}
              onPress={onSubmit}
            />
          </View>

          <View className="mt-auto items-center pb-6 pt-10">
            <Text className="font-sans text-text-secondary">
              ¿Ya tienes cuenta?{' '}
              <Text
                className="font-sans-semibold text-accent"
                onPress={() => router.replace('/(auth)/sign-in')}
              >
                Iniciar sesión
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
