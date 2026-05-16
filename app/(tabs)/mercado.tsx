import { View } from 'react-native';
import { Screen, Text } from '@/shared/ui';
import { useSession } from '@/features/session/SessionProvider';

export default function Mercado() {
  const { isGuest } = useSession();
  return (
    <Screen>
      <View className="flex-1 items-center justify-center px-6">
        <Text variant="overline">Mercado</Text>
        <Text variant="h2" className="mt-2 text-center">
          Compras directas y subastas
        </Text>
        <Text variant="bodySm" className="mt-3 text-center">
          {isGuest
            ? 'Registrate para ver cromos en venta, ofertar en subastas y publicar los tuyos.'
            : 'Pronto: ventas con precio fijo, paquetes de repetidos y subastas con cierre por tiempo.'}
        </Text>
      </View>
    </Screen>
  );
}
