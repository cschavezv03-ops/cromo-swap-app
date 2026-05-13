/**
 * TDD tests for auth helper.
 *
 * Contracts:
 * 1. signInAsGuest() calls supabase.auth.signInAnonymously()
 * 2. signInAsGuest() returns the result of signInAnonymously
 */

// Mock the supabase module directly so we don't need real env vars.
// Note: jest.mock is hoisted to the top, so we use jest.fn() inside the factory.
jest.mock('../../src/lib/supabase', () => {
  const mockAuth = {
    signInAnonymously: jest.fn(),
    startAutoRefresh: jest.fn(),
    stopAutoRefresh: jest.fn(),
    getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  };
  return {
    supabase: {
      auth: mockAuth,
    },
  };
});

import { signInAsGuest } from '../../src/lib/auth';
import { supabase } from '../../src/lib/supabase';

describe('auth helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signInAsGuest', () => {
    it('calls supabase.auth.signInAnonymously()', async () => {
      const mockSession = {
        access_token: 'anon-token',
        user: { id: 'anon-user-id', is_anonymous: true },
      };
      (supabase.auth.signInAnonymously as jest.Mock).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      await signInAsGuest();

      expect(supabase.auth.signInAnonymously).toHaveBeenCalledTimes(1);
    });

    it('returns the result from signInAnonymously', async () => {
      const mockResult = {
        data: { session: { access_token: 'anon-tok', user: { is_anonymous: true } } },
        error: null,
      };
      (supabase.auth.signInAnonymously as jest.Mock).mockResolvedValueOnce(mockResult);

      const result = await signInAsGuest();

      expect(result).toEqual(mockResult);
    });

    it('propagates errors from signInAnonymously', async () => {
      const mockError = { message: 'Anon sign-in not enabled' };
      (supabase.auth.signInAnonymously as jest.Mock).mockResolvedValueOnce({
        data: { session: null },
        error: mockError,
      });

      const result = await signInAsGuest();

      expect(result.error).toEqual(mockError);
    });
  });
});
