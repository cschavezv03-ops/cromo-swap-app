import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';

import {
  useRequestOtp,
  useSignUpWithPassword,
  useVerifyOtp,
} from '@/features/auth/hooks/useAuthMutations';
import { OTP_LENGTH } from '@/lib/env';
import { track } from '@/lib/observability';
import { Button, OtpInput, Screen, useToast } from '@/ui';

const RESEND_COOLDOWN_SEC = 60;

/**
 * Verificación OTP. Recibe `email` y `mode` por params:
 *   - mode='signup' → verifyOtp con type='signup' (confirma email post signup)
 *   - mode='magic'  → verifyOtp con type='email'  (login alt via OTP)
 *
 * Tras éxito, app/index.tsx detecta sesión y redirige a /album o
 * /profile-setup según corresponda.
 */
export default function VerifyScreen() {
  const router = useRouter();
  const toast = useToast();
  const { email, mode } = useLocalSearchParams<{
    email: string;
    mode: 'signup' | 'magic';
  }>();

  const verifyOtp = useVerifyOtp();
  const signUp = useSignUpWithPassword(); // para resend en signup
  const requestOtp = useRequestOtp(); // para resend en magic

  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SEC);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timer.current = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const handleVerify = async (value: string) => {
    if (!email || value.length !== OTP_LENGTH) return;
    try {
      await verifyOtp.mutateAsync({
        email,
        token: value,
        type: mode === 'signup' ? 'signup' : 'email',
      });
      track(mode === 'signup' ? 'otp_verified_signup' : 'otp_verified_login');
      // app/index.tsx hace el routing post-sesión
      router.replace('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Código inválido o expirado.';
      toast.show(msg, 'danger');
      setCode('');
    }
  };

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    try {
      // En signup no podemos re-llamar signUp (devuelve "already registered"),
      // así que pedimos un nuevo OTP via signInWithOtp con shouldCreateUser=false.
      await requestOtp.mutateAsync(email);
      toast.show('Código reenviado.', 'success');
      setCooldown(RESEND_COOLDOWN_SEC);
    } catch {
      toast.show('No se pudo reenviar el código.', 'danger');
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
            className="-ml-1 mb-3 h-9 w-9 items-center justify-center"
          >
            <Text className="text-xl text-text-primary">←</Text>
          </Pressable>

          <Text className="font-sans-semibold text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
            Verificación
          </Text>
          <Text
            className="mt-2 font-sans-black text-text-primary"
            style={{ fontSize: 28, lineHeight: 34, letterSpacing: -0.6 }}
          >
            Revisa tu correo
          </Text>
          <Text className="mt-3 font-sans text-text-secondary" style={{ fontSize: 15, lineHeight: 22 }}>
            Enviamos un código de {OTP_LENGTH} dígitos a{'\n'}
            <Text className="font-sans-semibold text-text-primary">{email}</Text>
          </Text>

          <View className="mt-8">
            <OtpInput
              length={OTP_LENGTH}
              value={code}
              onChange={setCode}
              onComplete={handleVerify}
              error={verifyOtp.isError}
            />
          </View>

          {verifyOtp.isPending && (
            <Text className="mt-4 text-center font-sans text-sm text-text-tertiary">
              Verificando…
            </Text>
          )}

          <View className="mt-10 items-center">
            <Pressable disabled={cooldown > 0} onPress={handleResend} hitSlop={8}>
              <Text
                className={
                  cooldown > 0
                    ? 'font-sans text-text-tertiary'
                    : 'font-sans-semibold text-accent'
                }
              >
                {cooldown > 0 ? `Reenviar código en ${cooldown}s` : 'Reenviar código'}
              </Text>
            </Pressable>
          </View>

          {mode === 'signup' && (
            <View className="mt-auto pb-8">
              <Text className="text-center font-sans text-[12px] text-text-tertiary">
                Una vez confirmes el código, podrás completar tu perfil.
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
