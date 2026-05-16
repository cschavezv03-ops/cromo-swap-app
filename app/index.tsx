import { Redirect } from 'expo-router';
import { useSession } from '@/features/session/SessionProvider';

export default function Index() {
  const { isGuest, isRegistered, nextOnboardingStep } = useSession();

  if (isRegistered && nextOnboardingStep !== 'done') {
    return <Redirect href={`/onboarding/${nextOnboardingStep}`} />;
  }
  if (isRegistered || isGuest) {
    return <Redirect href="/(tabs)/album" />;
  }
  return <Redirect href="/welcome" />;
}
