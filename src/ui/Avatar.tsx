import { Image } from 'expo-image';
import { Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  url?: string | null;
  name?: string | null;
  size?: number;
  style?: ViewStyle;
};

/**
 * Círculo de avatar: si hay `url` muestra la imagen, sino la inicial del
 * nombre sobre fondo `surface`. Tamaño configurable (default 40).
 */
export function Avatar({ url, name, size = 40, style }: Props) {
  const { colors } = useTheme();
  const initial = name?.trim()[0]?.toUpperCase() ?? '?';
  const fontSize = Math.round(size * 0.42);

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <Text
          className="font-sans-bold text-text-primary"
          style={{ fontSize }}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}
