import { Redirect } from 'expo-router';
import { useSession } from '@/lib/session-context';

/**
 * Root route — 4-branch redirect based on session + onboarding state.
 *
 * 1. No session          → /welcome
 * 2. Guest session        → /(tabs)/album  (guest can access album; other tabs gate)
 * 3. Registered + needs onboarding → /onboarding (layout handles step routing)
 * 4. Registered + onboarded        → /(tabs)/album
 */
export default function Index() {
  const { session, isGuest, needsOnboarding } = useSession();

  if (!session) {
    return <Redirect href="/welcome" />;
  }

  if (isGuest) {
    return <Redirect href="/(tabs)/album" />;
  }

  if (needsOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/album" />;
}
