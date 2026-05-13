import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useSession } from '@/lib/session-context';

/**
 * Onboarding stack layout — three zones:
 *
 *   PRE-SESSION (email, verify) — entry points; the user does not have a
 *     session yet. Don't enforce session here, don't auto-route away.
 *     Only bounce if the user is already fully onboarded.
 *
 *   ROUTING ROOT (bare /onboarding) — when navigation lands here with no
 *     specific step (e.g. after a state change), route to the correct step
 *     based on `onboardingStep`.
 *
 *   STEP SCREENS (university, whatsapp, scope) — require a session and an
 *     in-progress onboarding. Don't auto-redirect WITHIN these (each step
 *     handles its own navigation to the next one); only kick the user out
 *     if they shouldn't be in onboarding at all (no session / already done).
 */
export default function OnboardingLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { session, isGuest, needsOnboarding, onboardingStep } = useSession();

  // segments looks like ['onboarding'] at the bare /onboarding, or
  // ['onboarding','email'] at /onboarding/email. Take the last one.
  const current = segments[segments.length - 1] ?? '';
  const isPreSession = current === 'email' || current === 'verify';
  const isRoutingRoot = current === 'onboarding';

  useEffect(() => {
    // Pre-session entry points — allow no-session access.
    if (isPreSession) {
      if (session && !isGuest && !needsOnboarding) {
        router.replace('/(tabs)/album');
      }
      return;
    }

    // Post-session zone (routing root + step screens). All require a session.
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

    // Only the routing root auto-redirects to the correct step. The step
    // screens themselves (university/whatsapp/scope) handle their own
    // navigation forward — the layout doesn't second-guess them.
    if (isRoutingRoot) {
      if (onboardingStep === 'email') router.replace('/onboarding/email');
      else if (onboardingStep === 'whatsapp') router.replace('/onboarding/whatsapp');
      else if (onboardingStep === 'scope') router.replace('/onboarding/scope');
      else if (onboardingStep === 'done') router.replace('/(tabs)/album');
    }
  }, [session, isGuest, needsOnboarding, onboardingStep, isPreSession, isRoutingRoot, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
