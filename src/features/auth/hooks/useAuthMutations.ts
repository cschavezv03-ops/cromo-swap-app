import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { kv, KvKey } from '@/features/storage/kv';
import { resetUserData } from '@/features/storage/db';
import { pullRemoteInventory } from '@/features/album/data/inventory';
import { albumQueryKey } from '@/features/album/hooks/useAlbumData';

/**
 * Solicita un OTP por email para iniciar sesión via magic link / código.
 * Por default `shouldCreateUser: false` — usado solo para login alternativo
 * de cuentas existentes. Para signup nuevo, usar `useSignUpWithPassword`.
 */
export function useRequestOtp() {
  return useMutation({
    mutationFn: async (email: string) => {
      const trimmed = email.trim().toLowerCase();
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: 'cromoswap://auth/callback',
        },
      });
      if (error) throw error;
      return { email: trimmed };
    },
  });
}

/**
 * Signup nuevo: crea cuenta con email+password. Supabase envía un email
 * con OTP que debe ser verificado con `useVerifyOtp` (type='signup').
 */
export function useSignUpWithPassword() {
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const trimmed = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email: trimmed,
        password,
        options: { emailRedirectTo: 'cromoswap://auth/callback' },
      });
      if (error) throw error;
      return { email: trimmed, data };
    },
  });
}

/**
 * Verifica el OTP enviado al email tras signup o magic-link request.
 * - `type: 'signup'` para confirmar email post signup
 * - `type: 'email'` para magic link/OTP de login
 */
export function useVerifyOtp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      email,
      token,
      type = 'email',
    }: {
      email: string;
      token: string;
      type?: 'email' | 'signup' | 'magiclink' | 'recovery';
    }) => {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type,
      });
      if (error) throw error;
      try {
        await pullRemoteInventory();
      } catch {
        /* best-effort */
      }
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: albumQueryKey });
      void qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

/** Login con email+password. */
export function useSignInWithPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      try {
        await pullRemoteInventory();
      } catch {
        /* best-effort */
      }
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: albumQueryKey });
      void qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

/** Pide reset de contraseña. Manda email con OTP para recuperar. */
export function useResetPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const trimmed = email.trim().toLowerCase();
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: 'cromoswap://auth/callback',
      });
      if (error) throw error;
      return { email: trimmed };
    },
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Reset SOLO los datos del usuario, no el catálogo (read-only y
      // compartido). Si borraramos el catálogo, al re-loguear el álbum
      // quedaría vacío hasta el siguiente cold start.
      qc.clear();
      kv.set(KvKey.session.lastUserId, '');
      kv.remove(KvKey.lastSyncedAt);
      kv.remove(KvKey.album.lastFilter);
      kv.remove(KvKey.album.selectedCountries);
      await resetUserData();
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
      termsAcceptedVersion?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('No hay sesión activa.');

      const upsertPayload: Record<string, unknown> = {
        id: userId,
        display_name: patch.display_name ?? '',
        university: patch.university ?? null,
        scope: patch.scope ?? [],
      };
      if (patch.termsAcceptedVersion) {
        upsertPayload.terms_accepted_version = patch.termsAcceptedVersion;
        upsertPayload.terms_accepted_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('profiles')
        .upsert(upsertPayload, { onConflict: 'id' })
        .select('*')
        .single();
      if (error) throw error;

      // Si es la primera vez que el usuario completa su perfil (signup),
      // descargar su inventario remoto al local. Si ya estaba, este pull
      // se hace en cada arranque y es idempotente.
      try {
        await pullRemoteInventory();
      } catch {
        /* best-effort */
      }
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['profile'] });
      void qc.invalidateQueries({ queryKey: albumQueryKey });
    },
  });
}
