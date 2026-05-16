import { View } from 'react-native';
import { Screen, Text } from '@/shared/ui';
import { useSession } from '@/features/session/SessionProvider';

export default function Matches() {
  const { isGuest } = useSession();
  return (
    <Screen>
      <View className="flex-1 items-center justify-center px-6">
        <Text variant="overline">Matches</Text>
        <Text variant="h2" className="mt-2 text-center">
          Tus oportunidades de intercambio
        </Text>
        <Text variant="bodySm" className="mt-3 text-center">
          {isGuest
            ? 'Registrate para que la app te sugiera intercambios con personas de tu universidad.'
            : 'Pronto: matches automáticos según tus repetidos y los faltantes de otros.'}
        </Text>
      </View>
    </Screen>
  );
}
