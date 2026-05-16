import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';

import {
  useRequestOtp,
  useSignInWithPassword,
} from '@/features/auth/hooks/useAuthMutations';
import { isValidInstitutionalEmail } from '@/features/auth/lib/universities';
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

  const emailOk = isValidInstitutionalEmail(email);

  const handlePasswordLogin = async () => {
    try {
      await signIn.mutateAsync({ email, password });
      router.replace('/(app)/(tabs)/album');
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'No se pudo iniciar sesión.',
        'danger',
      );
    }
  };

  const handleMagicLink = async () => {
    try {
      await requestOtp.mutateAsync(email);
      router.push({ pathname: '/(auth)/verify', params: { email: email.trim().toLowerCase() } });
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'No se pudo enviar el código.',
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
            className="-ml-1 mb-2 h-9 w-9 items-center justify-center"
          >
            <Text className="text-text-primary text-xl">←</Text>
          </Pressable>

          <Text className="text-3xl font-sans-black text-text-primary">Inicia sesión</Text>
          <Text className="mt-3 text-base text-text-secondary font-sans">
            Vuelve a tu álbum donde lo dejaste.
          </Text>

          <View className="mt-6 flex-row gap-2">
            <Pressable
              onPress={() => setMode('password')}
              className={`flex-1 items-center rounded-md py-2.5 ${
                mode === 'password' ? 'bg-text-primary' : 'bg-surface'
              }`}
            >
              <Text
                className={`text-sm font-sans-semibold ${
                  mode === 'password' ? 'text-bg' : 'text-text-secondary'
                }`}
              >
                Contraseña
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('magic')}
              className={`flex-1 items-center rounded-md py-2.5 ${
                mode === 'magic' ? 'bg-text-primary' : 'bg-surface'
              }`}
            >
              <Text
                className={`text-sm font-sans-semibold ${
                  mode === 'magic' ? 'text-bg' : 'text-text-secondary'
                }`}
              >
                Código mágico
              </Text>
            </Pressable>
          </View>

          <View className="mt-6 gap-4">
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
                placeholder="Tu contraseña"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                value={password}
                onChangeText={setPassword}
              />
            )}
          </View>

          <View className="mt-10">
            {mode === 'password' ? (
              <Button
                label="Entrar"
                size="lg"
                loading={signIn.isPending}
                disabled={!emailOk || password.length < 8 || signIn.isPending}
                onPress={handlePasswordLogin}
              />
            ) : (
              <Button
                label="Enviar código"
                size="lg"
                loading={requestOtp.isPending}
                disabled={!emailOk || requestOtp.isPending}
                onPress={handleMagicLink}
              />
            )}
          </View>

          <View className="mt-auto pb-6">
            <Link href="/(auth)/email" className="text-center text-text-secondary font-sans">
              ¿Primera vez?{' '}
              <Text className="text-accent font-sans-semibold">Crea tu cuenta</Text>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
