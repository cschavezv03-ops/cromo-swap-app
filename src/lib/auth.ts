import { supabase } from './supabase';

/**
 * Sign in as an anonymous guest.
 * Returns the auth response from supabase.auth.signInAnonymously().
 * Guest users can only do personal album tracking — no social features.
 */
export const signInAsGuest = () => supabase.auth.signInAnonymously();
