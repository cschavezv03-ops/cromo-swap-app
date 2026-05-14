import { supabase } from './supabase';
import type { Database } from '@/types/database';

type BlockRow = Database['public']['Tables']['blocks']['Row'];

export interface BlockWithProfile extends BlockRow {
  profiles: {
    display_name: string;
    university: string | null;
  } | null;
}

/**
 * Block another user. RLS enforces blocker_id = auth.uid() and no self-block.
 */
export async function blockUser(blockedId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  return supabase.from('blocks').insert({
    blocker_id: user.id,
    blocked_id: blockedId,
  });
}

/**
 * Unblock a previously blocked user.
 */
export async function unblockUser(blockedId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  return supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedId);
}

/**
 * List all users blocked by the current user, joined with their display name.
 */
export async function listMyBlocks(): Promise<BlockWithProfile[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('blocks')
    .select('*, profiles!blocks_blocked_id_fkey(display_name, university)')
    .eq('blocker_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[blocks] listMyBlocks error:', error.message);
    return [];
  }
  return (data ?? []) as BlockWithProfile[];
}
