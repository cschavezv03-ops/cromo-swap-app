import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { useRequestOtp } from '@/features/auth/hooks/useAuthMutations';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, useToast } from '@/ui';

const RESEND_COOLDOWN_SEC = 60;

export default function LinkSentScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const { email } = useLocalSearchParams<{ email: string }>();
  const resend = useRequestOtp();

  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SEC);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timer.current = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    try {
      await resend.mutateAsync(email);
      toast.show('Enlace reenviado.', 'success');
      setCooldown(RESEND_COOLDOWN_SEC);
    } catch {
      toast.show('No se pudo reenviar el enlace.', 'danger');
    }
  };

  /**
   * Intenta abrir la INBOX (no componer mensaje) de la app de correo. Probamos
   * varios deep links conocidos en orden. El `mailto:` se evita porque abre
   * el editor en blanco, lo cual no es lo que queremos. Si ninguno funciona,
   * caemos a una nota visual.
   */
  const openMail = async () => {
    const candidates = [
      'googlegmail://',
      'ms-outlook://',
      'ymail://',
      'protonmail://',
      'message://',
    ];
    for (const url of candidates) {
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          return;
        }
      } catch {
        /* siguiente */
      }
    }
    toast.show('Abrí tu app de correo manualmente y tocá el enlace.', 'info');
  };

  return (
    <Screen>
      <View className="flex-1 px-7 pt-10">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="-ml-1 mb-3 h-9 w-9 items-center justify-center"
        >
          <Text className="text-xl text-text-primary">←</Text>
        </Pressable>

        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 24,
          }}
        >
          <Text style={{ fontSize: 32 }}>✉️</Text>
        </View>

        <Text
          className="mt-6 font-sans-black text-text-primary"
          style={{ fontSize: 28, lineHeight: 34, letterSpacing: -0.6 }}
        >
          Revisa tu correo
        </Text>
        <Text className="mt-3 font-sans text-text-secondary" style={{ fontSize: 15, lineHeight: 22 }}>
          Te enviamos un enlace mágico a{'\n'}
          <Text className="font-sans-bold text-text-primary">{email}</Text>
          {'\n\n'}
          Ábrelo <Text className="font-sans-bold">en este mismo teléfono</Text> y volverás
          aquí ya con sesión iniciada.
        </Text>

        <View className="mt-8">
          <Pressable
            onPress={openMail}
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
              style={{ color: colors.bg, fontSize: 16 }}
            >
              Abrir aplicación de correo
            </Text>
          </Pressable>
        </View>

        <View className="mt-auto pb-8">
          <Pressable disabled={cooldown > 0} onPress={handleResend} hitSlop={8}>
            <Text
              className={
                cooldown > 0
                  ? 'text-center font-sans text-text-tertiary'
                  : 'text-center font-sans-semibold text-accent'
              }
              style={{ fontSize: 14 }}
            >
              {cooldown > 0
                ? `Reenviar enlace en ${cooldown}s`
                : '¿No te llegó? Reenviar enlace'}
            </Text>
          </Pressable>

          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text
              className="mt-4 text-center font-sans text-text-tertiary"
              style={{ fontSize: 12 }}
            >
              ¿Correo equivocado? Volver y corregir
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
