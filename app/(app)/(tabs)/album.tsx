import { Text, View } from 'react-native';

import { Screen, ScreenHeader } from '@/ui';

export default function AlbumTab() {
  return (
    <Screen>
      <ScreenHeader eyebrow="Mundial 2026" title="El álbum" />
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-text-secondary text-center font-sans">
          Acá vas a tener tu álbum del Mundial 2026.{'\n'}
          240 cromos, filtros y matches en Fase 4.
        </Text>
      </View>
    </Screen>
  );
}
