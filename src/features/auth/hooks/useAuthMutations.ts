import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { kv, KvKey } from '@/features/storage/kv';
import { resetUserData } from '@/features/storage/db';
import { pullRemoteInventory } from '@/features/album/data/inventory';
import { albumQueryKey } from '@/features/album/hooks/useAlbumData';

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
