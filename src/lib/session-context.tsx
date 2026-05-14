import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { signInAsGuest as _signInAsGuest, signOut as _signOut } from './auth';
import { getMyProfile, getMyContact } from './profile';
import { onboardingStep, needsOnboarding, type OnboardingStep } from './onboarding';
import { queryClient } from './query-client';
import type { Database } from '@/types/database';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ContactRow = Database['public']['Tables']['profile_contacts']['Row'];

interface SessionContextValue {
  session: Session | null;
  isGuest: boolean;
  sessionResolved: boolean;
  profile: ProfileRow | null;
  contact: ContactRow | null;
  needsOnboarding: boolean;
  onboardingStep: OnboardingStep;
  refreshProfile: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Poll for profile up to maxAttempts × delayMs.
 * The handle_email_confirmed trigger writes the profile a beat after the session
 * appears, AND for non-anonymous users we additionally wait for `university` to
 * be populated by the same trigger — otherwise a fresh signup can render the
 * university-confirmation screen before derivation has propagated to the client.
 */
async function fetchProfileWithRetry(maxAttempts = 6, delayMs = 400): Promise<ProfileRow | null> {
  let lastSeen: ProfileRow | null = null;
  for (let i = 0; i < maxAttempts; i++) {
    const profile = await getMyProfile();
    if (profile !== null) {
      lastSeen = profile;
      // Guests don't need a university; registered users do — keep polling.
      if (profile.is_anonymous || profile.university !== null) return profile;
    }
    if (i < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return lastSeen;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [contact, setContact] = useState<ContactRow | null>(null);
  // Track previous user.id to detect cross-user identity changes (shared device)
  const sessionRef = useRef<Session | null>(null);

  const loadProfile = async (sess: Session | null) => {
    if (!sess || sess.user.is_anonymous) {
      // Guest or no session — try to get the guest profile row (provisioned by trigger)
      if (sess?.user.is_anonymous) {
        const p = await getMyProfile();
        setProfile(p);
      } else {
        setProfile(null);
      }
      setContact(null);
      return;
    }

    // Registered user: fetch profile (with retry for the derivation trigger delay)
    const p = await fetchProfileWithRetry();
    setProfile(p);
    if (p !== null) {
      const c = await getMyContact();
      setContact(c);
    } else {
      setContact(null);
    }
  };

  useEffect(() => {
    // Restore existing session on mount
    supabase.auth.getSession().then(async ({ data }) => {
      const sess = data.session ?? null;
      setSession(sess);
      sessionRef.current = sess;
      await loadProfile(sess);
      setSessionResolved(true);
    });

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      const prevId = sessionRef.current?.user.id ?? null;
      const nextId = newSession?.user.id ?? null;
      // Clear cache on any identity change (cross-user or sign-out) BEFORE loading new profile
      if (prevId !== nextId) {
        queryClient.clear();
      }
      sessionRef.current = newSession;
      setSession(newSession);
      await loadProfile(newSession);
      setSessionResolved(true);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []); // intentionally mount-only: loadProfile is a closure over setters which are stable

  const refreshProfile = async () => {
    // ALWAYS pull the freshest session from supabase rather than relying on
    // the closure-captured React `session` state. After verifyOtp() the new
    // session is mid-flight via onAuthStateChange — the React state can lag
    // by a tick, which made refreshProfile(null) overwrite the new profile
    // with null and bounced the user to the "no university" error.
    const { data } = await supabase.auth.getSession();
    const latest = data.session ?? null;
    if (sessionRef.current?.user.id !== latest?.user.id) {
      queryClient.clear();
    }
    sessionRef.current = latest;
    setSession(latest);
    await loadProfile(latest);
  };

  const signInAsGuest = async () => {
    const { data } = await _signInAsGuest();
    if (data.session) {
      setSession(data.session);
      await loadProfile(data.session);
    }
  };

  const signOut = async () => {
    await _signOut();
    queryClient.clear(); // nuke all cached data before zeroing local state
    setSession(null);
    setProfile(null);
    setContact(null);
    sessionRef.current = null;
  };

  const isGuest = session?.user?.is_anonymous ?? false;
  const currentStep = onboardingStep(profile, contact, isGuest);
  const userNeedsOnboarding = needsOnboarding(profile, contact, isGuest);

  return (
    <SessionContext.Provider
      value={{
        session,
        isGuest,
        sessionResolved,
        profile,
        contact,
        needsOnboarding: userNeedsOnboarding,
        onboardingStep: currentStep,
        refreshProfile,
        signInAsGuest,
        signOut,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used inside <SessionProvider>');
  }
  return ctx;
}
