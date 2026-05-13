import { Redirect } from 'expo-router';
import { useSession } from '@/lib/session-context';

/**
 * Root route — redirect based on session state.
 * session present → album tab; no session → welcome screen.
 */
export default function Index() {
  const { session } = useSession();

  if (session) {
    return <Redirect href="/(tabs)/album" />;
  }

  return <Redirect href="/welcome" />;
}
