import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';

import { UniversityBadge } from '@/features/auth/components/UniversityBadge';
import { useRequestOtp } from '@/features/auth/hooks/useAuthMutations';
import {
  allowedDomains,
  detectUniversityFromEmail,
  isValidInstitutionalEmail,
} from '@/features/auth/lib/universities';
import { Button, Input, Screen, useToast } from '@/ui';

export default function EmailScreen() {
  const router = useRouter();
  const toast = useToast();
  const requestOtp = useRequestOtp();

  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);

  const trimmed = email.trim().toLowerCase();
  const university = detectUniversityFromEmail(trimmed);
  const looksLikeEmail = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(trimmed);
  const valid = looksLikeEmail && isValidInstitutionalEmail(trimmed);
  const showError = touched && trimmed.length > 0 && looksLikeEmail && !valid;

  const onContinue = async () => {
    setTouched(true);
    if (!valid) return;
    try {
      await requestOtp.mutateAsync(trimmed);
      router.push({ pathname: '/(auth)/verify', params: { email: trimmed } });
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'No se pudo enviar el código. Inténtalo de nuevo.',
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
        <View className="flex-1 px-6 pt-10">
          <Text className="text-xs font-sans-semibold uppercase tracking-[0.18em] text-text-tertiary">
            Mundial 2026
          </Text>
          <Text className="mt-2 text-3xl font-sans-black text-text-primary">
            Empieza tu álbum
          </Text>
          <Text className="mt-3 text-base text-text-secondary font-sans">
            Te enviamos un código a tu correo universitario para crear tu cuenta o iniciar sesión.
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
              onBlur={() => setTouched(true)}
              error={
                showError
                  ? `Solo dominios institucionales: ${allowedDomains.join(', ')}`
                  : undefined
              }
            />
            <UniversityBadge university={university} />
          </View>

          <View className="mt-10">
            <Button
              label={requestOtp.isPending ? 'Enviando código…' : 'Continuar'}
              loading={requestOtp.isPending}
              disabled={!valid || requestOtp.isPending}
              onPress={onContinue}
              size="lg"
            />
          </View>

          <View className="mt-auto pb-6">
            <Pressable hitSlop={8}>
              <Link href="/(auth)/sign-in" className="text-center text-text-secondary font-sans">
                ¿Ya tienes cuenta?{' '}
                <Text className="text-accent font-sans-semibold">Inicia sesión</Text>
              </Link>
            </Pressable>
            {__DEV__ && (
              <Link
                href="/dev/ui"
                className="mt-4 text-center text-xs text-text-tertiary font-sans"
              >
                · dev · UI playground
              </Link>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
