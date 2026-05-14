/**
 * TDD tests for auth helper.
 *
 * Contracts:
 * 1. signInAsGuest() calls supabase.auth.signInAnonymously()
 * 2. signInAsGuest() returns the result of signInAnonymously
 * 3. requestEmailOtp(email) calls supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
 * 4. verifyEmailOtp(email, token) calls supabase.auth.verifyOtp({ email, token, type: 'email' })
 * 5. requestEmailChangeOtp(email) calls supabase.auth.updateUser({ email })
 * 6. verifyEmailChangeOtp(email, token) calls supabase.auth.verifyOtp({ email, token, type: 'email_change' })
 * 7. signOut() calls supabase.auth.signOut()
 */

// Mock the supabase module directly so we don't need real env vars.
// Note: jest.mock is hoisted to the top, so we use jest.fn() inside the factory.
jest.mock('../../src/lib/supabase', () => {
  const mockAuth = {
    signInAnonymously: jest.fn(),
    signInWithOtp: jest.fn(),
    verifyOtp: jest.fn(),
    updateUser: jest.fn(),
    signOut: jest.fn(),
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

import {
  signInAsGuest,
  requestEmailOtp,
  verifyEmailOtp,
  requestEmailChangeOtp,
  verifyEmailChangeOtp,
  signOut,
} from '../../src/lib/auth';
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

  describe('requestEmailOtp', () => {
    it('calls signInWithOtp with shouldCreateUser: true', async () => {
      (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValueOnce({ data: {}, error: null });

      await requestEmailOtp('student@epn.edu.ec');

      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'student@epn.edu.ec',
        options: { shouldCreateUser: true },
      });
    });

    it('returns the error when signInWithOtp fails', async () => {
      const mockError = { message: 'Dominio no reconocido' };
      (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValueOnce({ data: null, error: mockError });

      const result = await requestEmailOtp('student@gmail.com');

      expect(result.error).toEqual(mockError);
    });
  });

  describe('verifyEmailOtp', () => {
    it('calls verifyOtp with type: email', async () => {
      (supabase.auth.verifyOtp as jest.Mock).mockResolvedValueOnce({ data: {}, error: null });

      await verifyEmailOtp('student@epn.edu.ec', '123456');

      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
        email: 'student@epn.edu.ec',
        token: '123456',
        type: 'email',
      });
    });

    it('propagates verification errors', async () => {
      const mockError = { message: 'Token inválido' };
      (supabase.auth.verifyOtp as jest.Mock).mockResolvedValueOnce({ data: null, error: mockError });

      const result = await verifyEmailOtp('student@epn.edu.ec', 'bad-token');

      expect(result.error).toEqual(mockError);
    });
  });

  describe('requestEmailChangeOtp', () => {
    it('calls updateUser with the new email (guest upgrade path)', async () => {
      (supabase.auth.updateUser as jest.Mock).mockResolvedValueOnce({ data: {}, error: null });

      await requestEmailChangeOtp('student@puce.edu.ec');

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        email: 'student@puce.edu.ec',
      });
    });
  });

  describe('verifyEmailChangeOtp', () => {
    it('calls verifyOtp with type: email_change', async () => {
      (supabase.auth.verifyOtp as jest.Mock).mockResolvedValueOnce({ data: {}, error: null });

      await verifyEmailChangeOtp('student@puce.edu.ec', '654321');

      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
        email: 'student@puce.edu.ec',
        token: '654321',
        type: 'email_change',
      });
    });
  });

  describe('signOut', () => {
    it('calls supabase.auth.signOut()', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValueOnce({ error: null });

      await signOut();

      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    });
  });
});
