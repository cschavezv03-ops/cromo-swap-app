import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/ui';

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Screen>
      <View className="flex-1 px-7" style={{ justifyContent: 'space-between' }}>
        {/* Top: marca + tagline */}
        <View className="pt-10">
          <Text className="font-sans-semibold text-[11px] uppercase tracking-[0.32em] text-text-tertiary">
            Mundial 2026
          </Text>
          <Text
            className="mt-3 font-sans-black text-text-primary"
            style={{ fontSize: 42, lineHeight: 46, letterSpacing: -1.2 }}
          >
            Cromo{'\n'}Swap.
          </Text>
          <Text
            className="mt-4 font-sans text-text-secondary"
            style={{ fontSize: 17, lineHeight: 24 }}
          >
            Tu álbum, tus repetidos y tus amigos de la universidad — en un solo lugar.
          </Text>
        </View>

        {/* Middle: tres value props */}
        <View className="gap-5">
          <ValueProp
            number="01"
            title="Trackeá tu álbum"
            description="1013 cromos del Mundial. Sin papel ni planillas."
          />
          <ValueProp
            number="02"
            title="Intercambiá lo que te falta"
            description="Matches automáticos con gente que tiene tus repetidos."
          />
          <ValueProp
            number="03"
            title="Vende y comprá"
            description="Subastas y publicaciones dentro de tu universidad."
          />
        </View>

        {/* Bottom: 2 CTAs */}
        <View className="pb-8">
          <Pressable
            onPress={() => router.push('/(auth)/sign-up')}
            android_ripple={{ color: colors.surface }}
            style={{
              backgroundColor: colors.textPrimary,
              borderRadius: 999,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <Text
              className="font-sans-semibold"
              style={{ color: colors.bg, fontSize: 16, letterSpacing: 0.3 }}
            >
              Crear cuenta
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(auth)/sign-in')}
            android_ripple={{ color: colors.surface }}
            style={{
              marginTop: 10,
              borderRadius: 999,
              paddingVertical: 16,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              className="font-sans-semibold text-text-primary"
              style={{ fontSize: 16, letterSpacing: 0.3 }}
            >
              Ya tengo cuenta
            </Text>
          </Pressable>

          <Text className="mt-4 text-center font-sans text-[12px] text-text-tertiary">
            Solo correos institucionales de universidades de Quito.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

function ValueProp({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <View className="flex-row">
      <Text
        className="font-sans-bold text-text-tertiary"
        style={{ fontSize: 13, letterSpacing: 0.4, minWidth: 36, marginTop: 2 }}
      >
        {number}
      </Text>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text
          className="font-sans-bold text-text-primary"
          style={{ fontSize: 18, letterSpacing: -0.2 }}
        >
          {title}
        </Text>
        <Text
          className="mt-1 font-sans text-text-tertiary"
          style={{ fontSize: 14, lineHeight: 20 }}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}
