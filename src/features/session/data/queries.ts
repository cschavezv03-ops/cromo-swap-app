import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import type { Tables } from '@/shared/types/database';

export type Profile = Tables<'profiles'>;
export type ProfileContact = Tables<'profile_contacts'>;

export const sessionKeys = {
  profile: (userId: string | undefined) => ['profile', userId] as const,
  contact: (userId: string | undefined) => ['profile_contact', userId] as const,
};

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: sessionKeys.profile(userId),
    enabled: !!userId,
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

export function useProfileContact(userId: string | undefined) {
  return useQuery({
    queryKey: sessionKeys.contact(userId),
    enabled: !!userId,
    queryFn: async (): Promise<ProfileContact | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profile_contacts')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
