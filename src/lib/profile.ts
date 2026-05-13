import { supabase } from './supabase';
import type { Database } from '@/types/database';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ContactRow = Database['public']['Tables']['profile_contacts']['Row'];
type UniversityRow = Database['public']['Tables']['universities']['Row'];

/**
 * Fetch the current user's profile row.
 * Returns null if no profile exists yet (unconfirmed registered user).
 */
export async function getMyProfile(): Promise<ProfileRow | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    // No PII logged — only the error message
    console.error('[profile] getMyProfile error:', error.message);
    return null;
  }
  return data;
}

/**
 * Fetch the current user's profile_contacts row (WhatsApp number).
 * Returns null if not yet set.
 */
export async function getMyContact(): Promise<ContactRow | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profile_contacts')
    .select('whatsapp_phone, user_id, created_at, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[profile] getMyContact error:', error.message);
    return null;
  }
  return data;
}

/**
 * Upsert the current user's WhatsApp number in profile_contacts.
 * Client-side: validate E.164 format before calling this.
 */
export async function setMyWhatsapp(phone: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };

  return supabase.from('profile_contacts').upsert(
    { user_id: user.id, whatsapp_phone: phone },
    { onConflict: 'user_id' },
  );
}

/**
 * Set the scope (array of university IDs) on the current user's profile.
 * The user's own university is always included by the caller.
 * This is the deliberate "Confirmar scope" finalisation action (R3-18).
 */
export async function setMyScope(universityIds: string[]) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };

  return supabase
    .from('profiles')
    .update({ scope: universityIds })
    .eq('id', user.id);
}

/**
 * List all universities (for scope selection and email-domain hints).
 */
export async function listUniversities(): Promise<UniversityRow[]> {
  const { data, error } = await supabase
    .from('universities')
    .select('*')
    .order('id');

  if (error) {
    console.error('[profile] listUniversities error:', error.message);
    return [];
  }
  return data ?? [];
}
