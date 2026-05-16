import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Screen, Text } from '@/shared/ui';
import { useSession } from '@/features/session/SessionProvider';
import { useUniversities } from '@/features/onboarding/data/universities';

export default function Perfil() {
  const router = useRouter();
  const { isGuest, profile, contact, signOut } = useSession();
  const { data: universities = [] } = useUniversities();
  const universityName =
    universities.find((u) => u.id === profile?.university)?.name ?? profile?.university;

  return (
    <Screen>
      <View className="flex-1 gap-4 px-6 pt-6">
        <Text variant="overline">Perfil</Text>
        <Text variant="h1">
          {isGuest ? 'Modo visitante' : (profile?.display_name ?? 'Tu cuenta')}
        </Text>

        {isGuest ? (
          <Card className="gap-3">
            <Text variant="h3">Solo estás trackeando</Text>
            <Text variant="bodySm">
              Para hacer matches, intercambiar, vender o subastar tenés que crear una cuenta con tu correo universitario. Tu progreso del álbum se preserva.
            </Text>
            <Button
              label="Crear cuenta ahora"
              size="lg"
              onPress={() => router.push('/onboarding/email')}
            />
          </Card>
        ) : (
          <Card className="gap-2">
            <Text variant="overline">Universidad</Text>
            <Text variant="body" className="font-semibold">
              {universityName ?? 'Sin definir'}
            </Text>
            {profile?.scope && profile.scope.length > 0 ? (
              <>
                <Text variant="overline" className="mt-2">
                  Scope ({profile.scope.length})
                </Text>
                <Text variant="bodySm">
                  {profile.scope
                    .map((id) => universities.find((u) => u.id === id)?.short ?? id)
                    .join(' · ')}
                </Text>
              </>
            ) : null}
            {contact?.whatsapp_phone ? (
              <>
                <Text variant="overline" className="mt-2">
                  WhatsApp
                </Text>
                <Text variant="bodySm">{contact.whatsapp_phone}</Text>
              </>
            ) : null}
            <Button
              label="Cerrar sesión"
              variant="secondary"
              className="mt-3"
              onPress={signOut}
            />
          </Card>
        )}
      </View>
    </Screen>
  );
}
