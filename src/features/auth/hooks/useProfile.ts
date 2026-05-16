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

export function isProfileComplete(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  return Boolean(profile.display_name) && Boolean(profile.university);
}
