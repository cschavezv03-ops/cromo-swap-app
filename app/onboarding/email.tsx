import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input, Screen, Text } from '@/shared/ui';
import { useStartEmailSignIn } from '@/features/auth/data/mutations';
import { useSession } from '@/features/session/SessionProvider';

export default function EmailStep() {
  const router = useRouter();
  const { isGuest } = useSession();
  const startSignIn = useStartEmailSignIn();
  const [email, setEmail] = useState('');

  const submit = async () => {
    try {
      await startSignIn.mutateAsync({ email, isGuestUpgrade: isGuest });
      router.push({ pathname: '/onboarding/verify', params: { email } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No pudimos enviar el código';
      Alert.alert('Algo salió mal', msg);
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
              <Text variant="overline">Paso 1 de 4</Text>
              <Text variant="h1" className="mt-2">
                Tu correo universitario
              </Text>
              <Text variant="bodySm" className="mt-2">
                Solo aceptamos dominios reconocidos (epn, puce, usfq, udla, uce, etc.). Te mandamos un código de 6 dígitos.
              </Text>
            </View>
            <Input
              label="Correo institucional"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              placeholder="usuario@epn.edu.ec"
              value={email}
              onChangeText={setEmail}
              returnKeyType="send"
              onSubmitEditing={submit}
            />
          </View>
          <Button
            label="Enviarme el código"
            size="lg"
            disabled={!email.includes('@')}
            loading={startSignIn.isPending}
            onPress={submit}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
