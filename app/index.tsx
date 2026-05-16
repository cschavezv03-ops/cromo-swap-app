import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { isProfileComplete, useProfile } from '@/features/auth/hooks/useProfile';
import { useSession } from '@/features/auth/hooks/useSession';

export default function Index() {
  const { session, isLoading: sessionLoading } = useSession();
  const profileQuery = useProfile();

  if (sessionLoading) {
    return <Loading />;
  }

  if (!session) {
    return <Redirect href="/(auth)/email" />;
  }

  if (profileQuery.isPending || profileQuery.isError) {
    return <Loading />;
  }

  if (!isProfileComplete(profileQuery.data ?? null)) {
    return <Redirect href="/(auth)/profile-setup" />;
  }

  return <Redirect href="/(app)/(tabs)/album" />;
}

function Loading() {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <ActivityIndicator />
    </View>
  );
}
