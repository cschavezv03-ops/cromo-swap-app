import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { isProfileComplete, useProfile } from '@/features/auth/hooks/useProfile';
import { useSession } from '@/features/auth/hooks/useSession';

export default function AppLayout() {
  const { session, isLoading: sessionLoading } = useSession();
  const { data: profile, isLoading: profileLoading } = useProfile();

  if (sessionLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/email" />;
  }

  if (profileLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator />
      </View>
    );
  }

  if (!isProfileComplete(profile)) {
    return <Redirect href="/(auth)/profile-setup" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
