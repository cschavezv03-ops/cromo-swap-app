import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Linking, ScrollView, Text, View } from 'react-native';

import { Card, Screen, ScreenHeader } from '@/ui';

const TERMS_URL = 'https://cromoswap.com/terminos';
const PRIVACY_URL = 'https://cromoswap.com/privacidad';
const SUPPORT_EMAIL = 'soporte@cromoswap.com';

export default function AboutScreen() {
  const router = useRouter();
  const version =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '0.0.0';

  return (
    <Screen>
      <ScreenHeader title="Acerca de" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 16 }}>
        <Card variant="elevated">
          <Text className="text-text-tertiary text-[11px] font-sans-semibold uppercase tracking-[0.2em]">
            App
          </Text>
          <Text className="mt-1 text-2xl font-sans-bold text-text-primary">
            Cromo Swap
          </Text>
          <Text className="mt-0.5 text-sm font-sans text-text-secondary">
            Versión {version}
          </Text>
          <Text className="mt-3 text-sm font-sans text-text-secondary">
            Plataforma social para coleccionistas universitarios del Mundial 2026 en Quito.
            Rastrea tu álbum, propone intercambios y conectá con otros que coleccionan.
          </Text>
        </Card>

        <Card variant="elevated">
          <Text className="text-text-tertiary text-[11px] font-sans-semibold uppercase tracking-[0.2em]">
            Legal
          </Text>
          <AboutLink label="Términos y condiciones" url={TERMS_URL} />
          <AboutLink label="Política de privacidad" url={PRIVACY_URL} />
        </Card>

        <Card variant="elevated">
          <Text className="text-text-tertiary text-[11px] font-sans-semibold uppercase tracking-[0.2em]">
            Soporte
          </Text>
          <AboutLink label={SUPPORT_EMAIL} url={`mailto:${SUPPORT_EMAIL}`} />
        </Card>

        <Text className="mt-4 px-2 text-center text-[11px] font-sans text-text-tertiary">
          Hecho con cariño en Quito. Cromo Swap no está afiliado a Panini ni a la FIFA.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function AboutLink({ label, url }: { label: string; url: string }) {
  return (
    <Text
      className="mt-2 text-sm font-sans-semibold text-accent"
      onPress={() => {
        void Linking.openURL(url);
      }}
    >
      {label}
    </Text>
  );
}
