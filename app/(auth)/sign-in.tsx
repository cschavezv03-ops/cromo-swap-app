import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import {
  useRequestOtp,
  useSignInWithPassword,
} from '@/features/auth/hooks/useAuthMutations';
import { isValidInstitutionalEmail } from '@/features/auth/lib/universities';
import { identify, track } from '@/lib/observability';
import { Button, Input, Screen, useToast } from '@/ui';

type Mode = 'password' | 'magic';

export default function SignInScreen() {
  const router = useRouter();
  const toast = useToast();
  const signIn = useSignInWithPassword();
  const requestOtp = useRequestOtp();

  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const trimmed = email.trim().toLowerCase();
  const emailOk = isValidInstitutionalEmail(trimmed);

  const handlePasswordLogin = async () => {
    if (!emailOk || password.length < 1) return;
    try {
      const result = await signIn.mutateAsync({ email: trimmed, password });
      if (result.user?.id) identify(result.user.id);
      track('user_signed_in', { method: 'password' });
      router.replace('/(app)/(tabs)/album');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo iniciar sesión.';
      if (msg.toLowerCase().includes('invalid')) {
        toast.show('Correo o contraseña incorrectos.', 'danger');
      } else {
        toast.show(msg, 'danger');
      }
    }
  };

  const handleMagicLink = async () => {
    if (!emailOk) return;
    try {
      await requestOtp.mutateAsync(trimmed);
      track('magic_link_requested', { method: 'login' });
      router.push({
        pathname: '/(auth)/verify',
        params: { email: trimmed, mode: 'magic' },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo enviar el código.';
      toast.show(msg, 'danger');
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
            Iniciar sesión
          </Text>
          <Text
            className="mt-2 font-sans-black text-text-primary"
            style={{ fontSize: 28, lineHeight: 34, letterSpacing: -0.6 }}
          >
            Bienvenido de vuelta
          </Text>

          {/* Tabs */}
          <View className="mt-6 flex-row gap-2">
            <Tab label="Contraseña" active={mode === 'password'} onPress={() => setMode('password')} />
            <Tab label="Código por email" active={mode === 'magic'} onPress={() => setMode('magic')} />
          </View>

          <View className="mt-7 gap-4">
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
            />
            {mode === 'password' && (
              <Input
                label="Contraseña"
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                value={password}
                onChangeText={setPassword}
              />
            )}
          </View>

          {mode === 'magic' && (
            <Text className="mt-4 font-sans text-[13px] text-text-tertiary">
              Te enviaremos un código a tu correo para entrar sin contraseña.
            </Text>
          )}

          <View className="mt-8">
            {mode === 'password' ? (
              <Button
                label={signIn.isPending ? 'Iniciando…' : 'Iniciar sesión'}
                size="lg"
                loading={signIn.isPending}
                disabled={!emailOk || password.length < 1 || signIn.isPending}
                onPress={handlePasswordLogin}
              />
            ) : (
              <Button
                label={requestOtp.isPending ? 'Enviando…' : 'Enviar código'}
                size="lg"
                loading={requestOtp.isPending}
                disabled={!emailOk || requestOtp.isPending}
                onPress={handleMagicLink}
              />
            )}
          </View>

          <View className="mt-auto items-center pb-6 pt-10">
            <Text className="font-sans text-text-secondary">
              ¿No tenés cuenta?{' '}
              <Text
                className="font-sans-semibold text-accent"
                onPress={() => router.replace('/(auth)/sign-up')}
              >
                Crear cuenta
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Tab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 items-center rounded-md py-2.5 ${
        active ? 'bg-text-primary' : 'bg-surface'
      }`}
    >
      <Text
        className={`font-sans-semibold text-sm ${active ? 'text-bg' : 'text-text-secondary'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
