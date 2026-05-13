import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useSession } from '@/lib/session-context';

/**
 * Onboarding stack layout with route guard.
 *
 * Two zones inside /onboarding:
 *   PRE-SESSION (email, verify) — entry points; the user does not have a
 *     session yet. The layout MUST NOT bounce them away just because !session.
 *     Only bounce if they're already fully onboarded (no business here).
 *   POST-SESSION (university, whatsapp, scope) — require a session, and
 *     route to the correct step based on session.onboardingStep.
 *
 * A guest who taps "Crear cuenta" lands on /onboarding/email to upgrade;
 * we let them stay (the upgrade is `supabase.auth.updateUser({ email })`).
 */
export default function OnboardingLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { session, isGuest, needsOnboarding, onboardingStep } = useSession();

  // segments looks like ['onboarding'] at /onboarding, or ['onboarding','email']
  // at /onboarding/email. Take the last one as the current step.
  const current = segments[segments.length - 1] ?? '';
  const isPreSession = current === 'email' || current === 'verify' || current === 'onboarding';

  useEffect(() => {
    if (isPreSession) {
      // Already fully onboarded? Get out of onboarding.
      if (session && !isGuest && !needsOnboarding) {
        router.replace('/(tabs)/album');
      }
      return;
    }

    // Post-session steps from here on.
    if (!session) {
      router.replace('/welcome');
      return;
    }
    if (isGuest) {
      router.replace('/(tabs)/album');
      return;
    }
    if (!needsOnboarding) {
      router.replace('/(tabs)/album');
      return;
    }

    // Registered + needsOnboarding → ensure we're on the right step
    if (onboardingStep === 'whatsapp' && current !== 'whatsapp') {
      router.replace('/onboarding/whatsapp');
    } else if (onboardingStep === 'scope' && current !== 'scope') {
      router.replace('/onboarding/scope');
    } else if (onboardingStep === 'done') {
      router.replace('/(tabs)/album');
    }
  }, [session, isGuest, needsOnboarding, onboardingStep, current, isPreSession, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
