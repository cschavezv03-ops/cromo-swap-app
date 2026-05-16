import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';

import { useRequestOtp, useSetPassword, useVerifyOtp } from '@/features/auth/hooks/useAuthMutations';
import { OTP_LENGTH } from '@/lib/env';
import { Button, Input, OtpInput, Screen, useToast } from '@/ui';

const RESEND_COOLDOWN_SEC = 60;

export default function VerifyScreen() {
  const router = useRouter();
  const toast = useToast();
  const { email } = useLocalSearchParams<{ email: string }>();

  const verifyOtp = useVerifyOtp();
  const setPassword = useSetPassword();
  const requestOtp = useRequestOtp();

  const [code, setCode] = useState('');
  const [pwd, setPwd] = useState('');
  const [step, setStep] = useState<'code' | 'password'>('code');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SEC);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    cooldownTimer.current = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  const handleVerify = async (value: string) => {
    if (!email || value.length !== OTP_LENGTH) return;
    try {
      await verifyOtp.mutateAsync({ email, token: value });
      setStep('password');
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'Código inválido o expirado.',
        'danger',
      );
      setCode('');
    }
  };

  const handleSetPassword = async () => {
    if (pwd.length < 8) {
      toast.show('La contraseña debe tener al menos 8 caracteres.', 'warning');
      return;
    }
    try {
      await setPassword.mutateAsync(pwd);
      router.replace('/(auth)/profile-setup');
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'No pudimos guardar la contraseña.',
        'danger',
      );
    }
  };

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    try {
      await requestOtp.mutateAsync(email);
      toast.show('Código reenviado.', 'success');
      setCooldown(RESEND_COOLDOWN_SEC);
    } catch {
      toast.show('No pudimos reenviar el código.', 'danger');
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View className="flex-1 px-6 pt-10">
          <Pressable onPress={() => router.back()} hitSlop={8} className="-ml-1 mb-2 h-9 w-9 items-center justify-center">
            <Text className="text-text-primary text-xl">←</Text>
          </Pressable>

          {step === 'code' ? (
            <>
              <Text className="text-3xl font-sans-black text-text-primary">Revisá tu mail</Text>
              <Text className="mt-3 text-base text-text-secondary font-sans">
                Mandamos un código de {OTP_LENGTH} dígitos a{'\n'}
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
                <Text className="mt-4 text-center text-sm text-text-tertiary font-sans">
                  Verificando…
                </Text>
              )}

              <View className="mt-10 items-center">
                <Pressable disabled={cooldown > 0} onPress={handleResend} hitSlop={8}>
                  <Text
                    className={
                      cooldown > 0
                        ? 'text-text-tertiary font-sans'
                        : 'text-accent font-sans-semibold'
                    }
                  >
                    {cooldown > 0
                      ? `Reenviar código en ${cooldown}s`
                      : 'Reenviar código'}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text className="text-3xl font-sans-black text-text-primary">Creá una contraseña</Text>
              <Text className="mt-3 text-base text-text-secondary font-sans">
                Vas a usarla la próxima vez que entres con{' '}
                <Text className="font-sans-semibold text-text-primary">{email}</Text>.
              </Text>

              <View className="mt-8">
                <Input
                  label="Contraseña"
                  placeholder="Mínimo 8 caracteres"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                  textContentType="newPassword"
                  value={pwd}
                  onChangeText={setPwd}
                  helper={pwd.length > 0 && pwd.length < 8 ? `Faltan ${8 - pwd.length}` : undefined}
                />
              </View>

              <View className="mt-10">
                <Button
                  label="Continuar"
                  size="lg"
                  loading={setPassword.isPending}
                  disabled={pwd.length < 8 || setPassword.isPending}
                  onPress={handleSetPassword}
                />
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
