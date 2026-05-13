import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { signInAsGuest as _signInAsGuest } from './auth';

interface SessionContextValue {
  session: Session | null;
  isGuest: boolean;
  sessionResolved: boolean;
  signInAsGuest: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);

  useEffect(() => {
    // Restore existing session on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setSessionResolved(true);
    });

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setSessionResolved(true);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInAsGuest = async () => {
    const { data } = await _signInAsGuest();
    if (data.session) {
      setSession(data.session);
    }
  };

  const isGuest = session?.user?.is_anonymous ?? false;

  return (
    <SessionContext.Provider value={{ session, isGuest, sessionResolved, signInAsGuest }}>
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
