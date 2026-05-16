import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { kv, KvKey } from '@/features/storage/kv';
import { resetDatabase } from '@/features/storage/db';

export function useRequestOtp() {
  return useMutation({
    mutationFn: async (email: string) => {
      const trimmed = email.trim().toLowerCase();
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: 'cromoswap://auth/callback',
        },
      });
      if (error) throw error;
      return { email: trimmed };
    },
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: async ({ email, token }: { email: string; token: string }) => {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useSetPassword() {
  return useMutation({
    mutationFn: async (password: string) => {
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      return data;
    },
  });
}

export function useSignInWithPassword() {
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Hard reset local-only state on logout so a different user opening
      // the app doesn't see the previous user's cached data.
      qc.clear();
      kv.set(KvKey.session.lastUserId, '');
      await resetDatabase();
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: {
      display_name?: string;
      university?: string;
      scope?: string[];
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('No hay sesión activa.');

      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: userId,
            display_name: patch.display_name ?? '',
            university: patch.university ?? null,
            scope: patch.scope ?? [],
          },
          { onConflict: 'id' },
        )
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
