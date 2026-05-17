import { supabase } from '@/lib/supabase';

export type ProfileSearchResult = {
  id: string;
  display_name: string;
  university: string | null;
  album_pct: number | null;
  avatar_url: string | null;
  is_friend: boolean;
};

export async function searchProfiles(
  query: string,
  university: string | null = null,
  limit = 30,
): Promise<ProfileSearchResult[]> {
  const { data, error } = await supabase.rpc('fn_search_profiles', {
    p_query: query,
    p_university: university,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as ProfileSearchResult[];
}
