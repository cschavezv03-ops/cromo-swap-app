import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { isProfileComplete, useProfile } from '@/features/auth/hooks/useProfile';
import { useSession } from '@/features/auth/hooks/useSession';
import { useRegisterPushToken } from '@/features/notifications/hooks/useRegisterPushToken';
import { useRealtimeBridge } from '@/features/transactions/hooks/useRealtimeBridge';

export default function AppLayout() {
  const { session, isLoading: sessionLoading } = useSession();
  const profileQuery = useProfile();
  // Suscribe queries de matches/transactions/notifications a cambios en
  // tiempo real apenas haya sesión. Sale silencioso si no hay user.
  useRealtimeBridge();
  // Pide permisos y registra Expo push token en profiles.expo_push_token.
  useRegisterPushToken();

  // 1) Esperar la sesión inicial.
  if (sessionLoading) {
    return <Loading />;
  }

  // 2) Sin sesión → flujo de auth.
  if (!session) {
    return <Redirect href="/(auth)/email" />;
  }

  // 3) Con sesión, esperar a que el perfil se resuelva.
  //    `isPending` es true mientras data === undefined (ya sea porque la
  //    query está deshabilitada, fetching, o nunca terminó). Solo cuando
  //    es false sabemos si profile === null (no row) o un row real.
  if (profileQuery.isPending) {
    return <Loading />;
  }

  // 4) Si la query erroró, esperar/reintentar. Mostramos loading otra vez
  //    para no redirigir en falso a profile-setup por un problema de red.
  if (profileQuery.isError) {
    return <Loading />;
  }

  // 5) Perfil resuelto, sin display_name o university → setup.
  if (!isProfileComplete(profileQuery.data ?? null)) {
    return <Redirect href="/(auth)/profile-setup" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

function Loading() {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <ActivityIndicator />
    </View>
  );
}
