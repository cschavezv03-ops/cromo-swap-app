import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { isProfileComplete, useProfile } from '@/features/auth/hooks/useProfile';
import { useSession } from '@/features/auth/hooks/useSession';

export default function AppLayout() {
  const { session, isLoading: sessionLoading } = useSession();
  const { data: profile, isLoading: profileLoading, isFetching } = useProfile();

  // 1) Esperar la sesión.
  if (sessionLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator />
      </View>
    );
  }

  // 2) Sin sesión → flujo de auth.
  if (!session) {
    return <Redirect href="/(auth)/email" />;
  }

  // 3) Con sesión pero el perfil aún no resolvió (data===undefined o fetching
  //    por primera vez): esperar. Sin esto, un refetch breve durante el cold
  //    start nos mandaba a profile-setup aunque ya estuviera completo.
  if (profileLoading || (profile === undefined && isFetching)) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator />
      </View>
    );
  }

  // 4) Perfil resuelto pero incompleto (o sin fila).
  if (!isProfileComplete(profile ?? null)) {
    return <Redirect href="/(auth)/profile-setup" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
