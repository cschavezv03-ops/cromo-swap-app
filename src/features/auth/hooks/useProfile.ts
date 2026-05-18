import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Tables } from '@/shared/types/database';

import { useSession } from './useSession';

export type Profile = Tables<'profiles'>;

const QUERY_KEY_BASE = ['profile'] as const;

export function useProfile() {
  const { user, isLoading: sessionLoading } = useSession();
  const userId = user?.id;

  return useQuery({
    queryKey: [...QUERY_KEY_BASE, userId ?? 'none'],
    enabled: Boolean(userId) && !sessionLoading,
    // Always refetch on mount so the guard never sees a stale "no display_name"
    // value from the persistor cache (which caused unwanted redirects to
    // profile-setup after a successful onboarding).
    refetchOnMount: 'always',
    staleTime: 0,
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Devuelve `true` solo si el perfil EXISTE, tiene los datos mínimos Y el
 * usuario aceptó los Términos. Devuelve `false` si `null` (no hay fila) o
 * si falta algún campo, incluido el consentimiento legal.
 *
 * El trigger `handle_new_user` pre-llena display_name='Usuario' y la
 * universidad detectada del dominio del email, así que esos campos NO son
 * suficientes para saber si el user completó el onboarding interactivo.
 * `terms_accepted_version` es el gate real: solo se setea cuando el user
 * pasa por `/profile-setup` y marca el checkbox de aceptación.
 *
 * IMPORTANTE: nunca llamar con `undefined` (eso significa "todavía cargando"
 * y se debe esperar).
 */
export function isProfileComplete(profile: Profile | null): boolean {
  if (!profile) return false;
  return (
    Boolean(profile.display_name) &&
    Boolean(profile.university) &&
    Boolean(profile.terms_accepted_version)
  );
}
