import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input, Screen, Text } from '@/shared/ui';
import { useSetWhatsapp } from '@/features/onboarding/data/mutations';
import { useSession } from '@/features/session/SessionProvider';

export default function WhatsappStep() {
  const router = useRouter();
  const { user, contact } = useSession();
  const setWhatsapp = useSetWhatsapp();
  const [phone, setPhone] = useState(contact?.whatsapp_phone ?? '+593');

  const submit = async () => {
    if (!user?.id) return;
    try {
      await setWhatsapp.mutateAsync({ userId: user.id, phone });
      router.replace('/');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No pudimos guardar tu WhatsApp';
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
              <Text variant="overline">Paso 3 de 4</Text>
              <Text variant="h1" className="mt-2">
                Tu WhatsApp
              </Text>
              <Text variant="bodySm" className="mt-2">
                No lo vamos a mostrar a nadie hasta que aceptes un intercambio, una compra o ganes una subasta. Solo se revela cuando hay un acuerdo de ambas partes.
              </Text>
            </View>
            <Input
              label="Número con código de país"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="phone-pad"
              placeholder="+593987654321"
              value={phone}
              onChangeText={setPhone}
              returnKeyType="send"
              onSubmitEditing={submit}
              hint="Formato internacional E.164. Ej: +593 987 654 321"
            />
          </View>
          <Button
            label="Guardar y seguir"
            size="lg"
            disabled={phone.length < 9}
            loading={setWhatsapp.isPending}
            onPress={submit}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
