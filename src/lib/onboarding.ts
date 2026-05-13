import type { Database } from '@/types/database';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ContactRow = Database['public']['Tables']['profile_contacts']['Row'];

export type OnboardingStep = 'guest' | 'email' | 'whatsapp' | 'scope' | 'done';

/**
 * Pure function — derives the next onboarding step from profile + contact state.
 * No side effects. Safe to call in tests and in the session context.
 *
 * State machine:
 *   anonymous / no session → 'guest'
 *   registered, no profile row OR university null → 'email' (awaiting OTP confirm / derivation)
 *   university set, no profile_contacts row → 'whatsapp'
 *   contact set, scope empty → 'scope'
 *   all set → 'done'
 */
export function onboardingStep(
  profile: ProfileRow | null,
  contact: ContactRow | null,
  isAnonymous: boolean,
): OnboardingStep {
  // Guest: anonymous session or anonymous profile row
  if (isAnonymous || (profile !== null && profile.is_anonymous)) {
    return 'guest';
  }

  // No profile row yet, or university not yet derived → still in email/verify step
  if (profile === null || profile.university === null) {
    return 'email';
  }

  // University derived, but WhatsApp not captured yet
  if (contact === null) {
    return 'whatsapp';
  }

  // WhatsApp captured, but scope not confirmed
  if (profile.scope.length === 0) {
    return 'scope';
  }

  return 'done';
}

/**
 * Derived boolean: true when a registered (non-guest) user has not completed onboarding.
 */
export function needsOnboarding(
  profile: ProfileRow | null,
  contact: ContactRow | null,
  isAnonymous: boolean,
): boolean {
  const step = onboardingStep(profile, contact, isAnonymous);
  return step !== 'done' && step !== 'guest';
}
