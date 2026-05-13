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
 * The handle_email_confirmed trigger writes the profile a beat after the session appears.
 */
async function fetchProfileWithRetry(maxAttempts = 3, delayMs = 500): Promise<ProfileRow | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const profile = await getMyProfile();
    if (profile !== null) return profile;
    if (i < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return null;
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
    await loadProfile(session);
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
