import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/shared/lib/supabase';
import {
  sessionKeys,
  useProfile,
  useProfileContact,
  type Profile,
  type ProfileContact,
} from './data/queries';

export type OnboardingStep =
  | 'email'
  | 'verify'
  | 'university'
  | 'whatsapp'
  | 'scope'
  | 'done';

type SessionValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  contact: ProfileContact | null;
  isBootstrapping: boolean;
  isGuest: boolean;
  isRegistered: boolean;
  nextOnboardingStep: OnboardingStep;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

function deriveStep(profile: Profile | null, contact: ProfileContact | null): OnboardingStep {
  if (!profile) return 'email';
  if (profile.is_anonymous) return 'email';
  if (!profile.university) return 'university';
  if (!contact?.whatsapp_phone) return 'whatsapp';
  if (!profile.scope || profile.scope.length === 0) return 'scope';
  return 'done';
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!data.session) {
        // Guest mode: every visitor gets an anonymous Supabase user so they can
        // track their album. The DB trigger creates the profile row.
        const { data: anon, error } = await supabase.auth.signInAnonymously();
        if (!cancelled) {
          if (error) console.warn('Anonymous sign-in failed:', error.message);
          setSession(anon.session ?? null);
          setIsBootstrapping(false);
        }
        return;
      }

      setSession(data.session);
      setIsBootstrapping(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      // Invalidate identity-scoped queries on auth change.
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['profile_contact'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  const userId = session?.user.id;
  const profileQ = useProfile(userId);
  const contactQ = useProfileContact(userId);
  const profile = profileQ.data ?? null;
  const contact = contactQ.data ?? null;

  const isLoadingIdentity =
    !!userId && (profileQ.isLoading || (contactQ.isLoading && contactQ.fetchStatus !== 'idle'));

  const value = useMemo<SessionValue>(() => {
    const isGuest = !!session && (session.user.is_anonymous ?? profile?.is_anonymous ?? false);
    const isRegistered = !!session && !isGuest;
    return {
      session,
      user: session?.user ?? null,
      profile,
      contact,
      isBootstrapping: isBootstrapping || isLoadingIdentity,
      isGuest,
      isRegistered,
      nextOnboardingStep: isRegistered ? deriveStep(profile, contact) : 'email',
      signOut: async () => {
        await supabase.auth.signOut();
        await queryClient.invalidateQueries();
      },
    };
  }, [session, profile, contact, isBootstrapping, isLoadingIdentity, queryClient]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}

export { sessionKeys };
