import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Input, Screen, Text } from '@/shared/ui';
import { useStartEmailSignIn, useVerifyEmailOtp } from '@/features/auth/data/mutations';
import { useSession } from '@/features/session/SessionProvider';

export default function VerifyStep() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { isGuest } = useSession();
  const verify = useVerifyEmailOtp();
  const resend = useStartEmailSignIn();
  const [token, setToken] = useState('');

  const submit = async () => {
    if (!email) return;
    try {
      await verify.mutateAsync({ email, token, isGuestUpgrade: isGuest });
      // Onboarding gate in app/index will route to the next step automatically.
      router.replace('/');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Código incorrecto o expirado';
      Alert.alert('No pudimos verificar', msg);
    }
  };

  const onResend = async () => {
    if (!email) return;
    try {
      await resend.mutateAsync({ email, isGuestUpgrade: isGuest });
      Alert.alert('Listo', 'Te mandamos otro código.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No pudimos reenviar';
      Alert.alert('Ups', msg);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View className="flex-1 px-6 pb-8 pt-6">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
            <Text className="text-2xl">‹</Text>
          </Pressable>
          <View className="mt-4 flex-1 gap-6">
            <View>
              <Text variant="overline">Paso 1 de 4 · Verificar</Text>
              <Text variant="h1" className="mt-2">
                Pegá el código de 6 dígitos
              </Text>
              <Text variant="bodySm" className="mt-2">
                Te lo mandamos a <Text className="font-bold text-ink-900">{email}</Text>.
              </Text>
            </View>
            <Input
              label="Código"
              keyboardType="number-pad"
              placeholder="123456"
              maxLength={6}
              value={token}
              onChangeText={setToken}
              returnKeyType="send"
              onSubmitEditing={submit}
            />
            <Pressable onPress={onResend}>
              <Text variant="caption" className="text-verde-700">
                Reenviar código
              </Text>
            </Pressable>
          </View>
          <Button
            label="Verificar"
            size="lg"
            disabled={token.length < 6}
            loading={verify.isPending}
            onPress={submit}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
