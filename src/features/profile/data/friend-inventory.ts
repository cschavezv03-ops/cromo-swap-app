import { supabase } from '@/lib/supabase';

export type FriendCromo = {
  cromo_id: string;
  printed_code: string;
  jersey: number | null;
  display_name: string;
  player_name: string | null;
  country_code: string | null;
  owned_quantity: number;
};

export type FriendInventoryKind = 'repeated' | 'missing';

export async function fetchFriendInventory(
  userId: string,
  kind: FriendInventoryKind,
  limit = 200,
): Promise<FriendCromo[]> {
  const { data, error } = await supabase.rpc('fn_friend_inventory', {
    p_user_id: userId,
    p_kind: kind,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as FriendCromo[];
}
