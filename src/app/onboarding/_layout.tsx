import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useSession } from '@/lib/session-context';

/**
 * Onboarding stack layout with route guard.
 *
 * Guard logic:
 * - No session → /welcome
 * - Guest (non-upgrade) → /(tabs)/album  (guests enter only at /onboarding/email?upgrade=1)
 * - Registered + all done → /(tabs)/album
 * - Registered + needs onboarding → stay here; redirect to the right step
 *
 * The step routing is handled by each screen via the onboardingStep from useSession().
 * The _layout here routes the /onboarding root to the current step.
 */
export default function OnboardingLayout() {
  const router = useRouter();
  const { session, isGuest, needsOnboarding, onboardingStep } = useSession();

  useEffect(() => {
    if (!session) {
      router.replace('/welcome');
      return;
    }

    // A fully-onboarded registered user who navigates to /onboarding → bounce to app
    if (!isGuest && !needsOnboarding) {
      router.replace('/(tabs)/album');
      return;
    }

    // Route to the current step
    if (!isGuest && needsOnboarding) {
      const step = onboardingStep;
      if (step === 'email') router.replace('/onboarding/email');
      else if (step === 'whatsapp') router.replace('/onboarding/whatsapp');
      else if (step === 'scope') router.replace('/onboarding/scope');
      else if (step === 'done') router.replace('/(tabs)/album');
    }
    // Guest: stay — they may be on /onboarding/email?upgrade=1
  }, [session, isGuest, needsOnboarding, onboardingStep, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
