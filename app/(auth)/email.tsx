import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';

import { UniversityBadge } from '@/features/auth/components/UniversityBadge';
import { useRequestOtp } from '@/features/auth/hooks/useAuthMutations';
import {
  allowedDomains,
  detectUniversityFromEmail,
  isValidInstitutionalEmail,
} from '@/features/auth/lib/universities';
import { track } from '@/lib/observability';
import { Button, Input, Screen, useToast } from '@/ui';

export default function EmailScreen() {
  const router = useRouter();
  const toast = useToast();
  const requestMagicLink = useRequestOtp();

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
      await requestMagicLink.mutateAsync(trimmed);
      track('magic_link_requested', { university: university?.id ?? null });
      router.push({ pathname: '/(auth)/link-sent', params: { email: trimmed } });
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'No se pudo enviar el enlace. Inténtalo de nuevo.',
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
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="-ml-1 mb-3 h-9 w-9 items-center justify-center rounded-pill"
          >
            <Text className="text-xl text-text-primary">←</Text>
          </Pressable>

          <Text className="font-sans-semibold text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
            Tu correo
          </Text>
          <Text
            className="mt-2 font-sans-black text-text-primary"
            style={{ fontSize: 28, lineHeight: 34, letterSpacing: -0.6 }}
          >
            ¿Cuál es tu correo{'\n'}universitario?
          </Text>
          <Text className="mt-3 font-sans text-text-secondary" style={{ fontSize: 15 }}>
            Te enviamos un enlace mágico. Tócalo desde tu teléfono y entras a la app — sin
            contraseñas, sin códigos.
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
              label={requestMagicLink.isPending ? 'Enviando enlace…' : 'Enviar enlace mágico'}
              loading={requestMagicLink.isPending}
              disabled={!valid || requestMagicLink.isPending}
              onPress={onContinue}
              size="lg"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
