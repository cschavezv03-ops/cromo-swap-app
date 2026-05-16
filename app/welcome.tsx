import { View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Button, Screen, Text } from '@/shared/ui';

export default function Welcome() {
  const router = useRouter();
  return (
    <Screen>
      <View className="flex-1 px-6 pb-10 pt-16">
        <View className="flex-1 justify-center gap-6">
          <View>
            <Text variant="overline" className="text-verde-700">
              ◉ Cromos · Mundial 2026
            </Text>
            <Text variant="display" className="mt-3">
              Tu álbum.{'\n'}Tu cancha.
            </Text>
            <Text variant="body" className="mt-4 text-ink-700">
              Encontrá con quién intercambiar, vender o subastar tus cromos repetidos dentro de tu universidad.
              Gratis. Sin pagos en la app. Sin avisos.
            </Text>
          </View>
        </View>
        <View className="gap-3">
          <Button
            label="Crear cuenta con correo universitario"
            size="lg"
            onPress={() => router.push('/onboarding/email')}
          />
          <Button
            label="Solo trackear mi álbum"
            variant="secondary"
            size="lg"
            onPress={() => router.replace('/(tabs)/album')}
          />
          <View className="mt-2 flex-row items-center justify-center gap-1">
            <Text variant="caption">¿Ya tenés cuenta?</Text>
            <Link href="/onboarding/email" asChild>
              <Text variant="caption" className="font-bold text-verde-700">
                Iniciar sesión
              </Text>
            </Link>
          </View>
        </View>
      </View>
    </Screen>
  );
}
