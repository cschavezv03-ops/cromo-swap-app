/**
 * TDD tests for onboarding pure function.
 * Written BEFORE implementation (Strict TDD).
 *
 * onboardingStep(profile, contact) derives the next step from profile/contact state.
 * Branches:
 *   - no session or anonymous → 'guest'
 *   - registered but no profile row → 'email' (awaiting email confirm / derivation)
 *   - profile present but university null → 'email'
 *   - university set but no profile_contacts row → 'whatsapp'
 *   - contact set but scope empty → 'scope'
 *   - all set → 'done'
 */

import { onboardingStep } from '../../src/lib/onboarding';

// Minimal row shapes matching database.ts
const baseProfile = {
  id: 'user-1',
  display_name: 'Usuario',
  is_anonymous: false,
  university: 'EPN',
  scope: ['EPN'],
  album_pct: null,
  auction_blocked_until: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const baseContact = {
  user_id: 'user-1',
  whatsapp_phone: '+593987654321',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('onboardingStep', () => {
  describe('guest path', () => {
    it('returns guest when profile is null and isAnonymous is true', () => {
      expect(onboardingStep(null, null, true)).toBe('guest');
    });

    it('returns guest when profile is anonymous', () => {
      const guestProfile = { ...baseProfile, is_anonymous: true, university: null };
      expect(onboardingStep(guestProfile, null, true)).toBe('guest');
    });
  });

  describe('email / awaiting verification', () => {
    it('returns email when profile is null and not anonymous', () => {
      expect(onboardingStep(null, null, false)).toBe('email');
    });

    it('returns email when profile exists but university is null', () => {
      const noUniProfile = { ...baseProfile, university: null };
      expect(onboardingStep(noUniProfile, null, false)).toBe('email');
    });
  });

  describe('whatsapp step', () => {
    it('returns whatsapp when university set but no contact row', () => {
      expect(onboardingStep(baseProfile, null, false)).toBe('whatsapp');
    });
  });

  describe('scope step', () => {
    it('returns scope when contact set but scope is empty array', () => {
      const noScopeProfile = { ...baseProfile, scope: [] };
      expect(onboardingStep(noScopeProfile, baseContact, false)).toBe('scope');
    });
  });

  describe('done', () => {
    it('returns done when university set, contact set, and scope non-empty', () => {
      expect(onboardingStep(baseProfile, baseContact, false)).toBe('done');
    });

    it('returns done when scope has multiple universities', () => {
      const wideScope = { ...baseProfile, scope: ['EPN', 'PUCE', 'UCE'] };
      expect(onboardingStep(wideScope, baseContact, false)).toBe('done');
    });
  });
});
