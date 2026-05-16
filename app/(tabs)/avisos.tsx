import { View } from 'react-native';
import { Screen, Text } from '@/shared/ui';

export default function Avisos() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center px-6">
        <Text variant="overline">Avisos</Text>
        <Text variant="h2" className="mt-2 text-center">
          Tu bandeja
        </Text>
        <Text variant="bodySm" className="mt-3 text-center">
          Aquí van a llegar matches nuevos, solicitudes de intercambio, ofertas de subasta y confirmaciones.
        </Text>
      </View>
    </Screen>
  );
}
