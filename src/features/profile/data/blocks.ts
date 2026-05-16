import { supabase } from '@/lib/supabase';
import type { Tables } from '@/shared/types/database';

export type BlockRow = Tables<'blocks'> & {
  blocked: {
    id: string;
    display_name: string;
    university: string | null;
  } | null;
};

/**
 * Lista a los usuarios que YO he bloqueado, con su perfil joined.
 * RLS: blocks_own_all permite SELECT cuando blocker_id = auth.uid().
 */
export async function fetchMyBlocks(): Promise<BlockRow[]> {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from('blocks')
    .select('id, blocker_id, blocked_id, created_at, blocked:profiles!blocks_blocked_id_fkey(id, display_name, university)')
    .eq('blocker_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as BlockRow[];
}

/**
 * Bloquea a `targetUserId`. INSERT idempotente — si ya está bloqueado,
 * el error se silencia.
 */
export async function blockUser(targetUserId: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) throw new Error('Sin sesión activa.');
  if (userId === targetUserId) throw new Error('No puedes bloquearte.');

  const { error } = await supabase
    .from('blocks')
    .insert({ blocker_id: userId, blocked_id: targetUserId });

  // Duplicate constraint (ya bloqueado) → no es un error real.
  if (error && !error.message.toLowerCase().includes('duplicate')) {
    throw error;
  }
}

export async function unblockUser(targetUserId: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) throw new Error('Sin sesión activa.');

  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', userId)
    .eq('blocked_id', targetUserId);
  if (error) throw error;
}

export async function isBlocked(targetUserId: string): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) return false;

  const { data, error } = await supabase
    .from('blocks')
    .select('id')
    .eq('blocker_id', userId)
    .eq('blocked_id', targetUserId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}
