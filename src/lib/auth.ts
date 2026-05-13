import { supabase } from './supabase';

/**
 * Sign in as an anonymous guest.
 * Returns the auth response from supabase.auth.signInAnonymously().
 * Guest users can only do personal album tracking — no social features.
 */
export const signInAsGuest = () => supabase.auth.signInAnonymously();

/**
 * Request an email OTP for a new signup.
 * The before_user_created_hook on the server rejects non-institutional domains.
 * The client should display the error message without logging the email address.
 */
export const requestEmailOtp = (email: string) =>
  supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });

/**
 * Verify an email OTP for a fresh signup.
 * On success, onAuthStateChange fires and the session context re-fetches the profile.
 */
export const verifyEmailOtp = (email: string, token: string) =>
  supabase.auth.verifyOtp({ email, token, type: 'email' });

/**
 * Guest → registered upgrade: request an email-change OTP for the anonymous user.
 * Uses updateUser (not signInWithOtp) so the auth.users.id is preserved,
 * which keeps existing inventory FKs intact.
 * NOTE: the before_user_created_hook does NOT fire on this path.
 * Domain validation happens in the handle_email_confirmed trigger.
 */
export const requestEmailChangeOtp = (newEmail: string) =>
  supabase.auth.updateUser({ email: newEmail });

/**
 * Verify an email-change OTP (guest → registered upgrade).
 * On success, the handle_email_confirmed trigger sets university and is_anonymous=false.
 */
export const verifyEmailChangeOtp = (newEmail: string, token: string) =>
  supabase.auth.verifyOtp({ email: newEmail, token, type: 'email_change' });

/**
 * Sign out the current user and clear the session.
 */
export const signOut = () => supabase.auth.signOut();
