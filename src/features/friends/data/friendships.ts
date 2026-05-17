import { supabase } from '@/lib/supabase';

export type FriendshipStatus = 'none' | 'pending_in' | 'pending_out' | 'friends';

export type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'removed';
  created_at: string;
  responded_at: string | null;
};

export type FriendProfile = {
  id: string;
  display_name: string;
  university: string | null;
  album_pct: number | null;
};

export type FriendItem = {
  friendship_id: string;
  status: 'pending' | 'accepted';
  profile: FriendProfile;
  created_at: string;
};

/** Devuelve todos los amigos aceptados — el "otro" lado del row según yo soy requester o addressee. */
export async function fetchMyFriends(): Promise<FriendItem[]> {
  const { data: u } = await supabase.auth.getUser();
  const me = u.user?.id;
  if (!me) return [];

  const { data, error } = await supabase
    .from('friendships')
    .select(
      'id, requester_id, addressee_id, status, created_at, responded_at, ' +
        'requester:profiles!friendships_requester_id_fkey(id,display_name,university,album_pct),' +
        'addressee:profiles!friendships_addressee_id_fkey(id,display_name,university,album_pct)',
    )
    .eq('status', 'accepted')
    .or(`requester_id.eq.${me},addressee_id.eq.${me}`)
    .order('responded_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    requester_id: string;
    addressee_id: string;
    created_at: string;
    responded_at: string | null;
    requester: FriendProfile;
    addressee: FriendProfile;
  }>;

  return rows.map((row) => {
    const other = row.requester_id === me ? row.addressee : row.requester;
    return {
      friendship_id: row.id,
      status: 'accepted' as const,
      profile: other,
      created_at: row.responded_at ?? row.created_at,
    };
  });
}

/** Solicitudes que recibí pendientes. */
export async function fetchPendingIn(): Promise<FriendItem[]> {
  const { data: u } = await supabase.auth.getUser();
  const me = u.user?.id;
  if (!me) return [];

  const { data, error } = await supabase
    .from('friendships')
    .select(
      'id, status, created_at, ' +
        'requester:profiles!friendships_requester_id_fkey(id,display_name,university,album_pct)',
    )
    .eq('status', 'pending')
    .eq('addressee_id', me)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    created_at: string;
    requester: FriendProfile;
  }>;

  return rows.map((row) => ({
    friendship_id: row.id,
    status: 'pending' as const,
    profile: row.requester,
    created_at: row.created_at,
  }));
}

/** Solicitudes que envié pendientes. */
export async function fetchPendingOut(): Promise<FriendItem[]> {
  const { data: u } = await supabase.auth.getUser();
  const me = u.user?.id;
  if (!me) return [];

  const { data, error } = await supabase
    .from('friendships')
    .select(
      'id, status, created_at, ' +
        'addressee:profiles!friendships_addressee_id_fkey(id,display_name,university,album_pct)',
    )
    .eq('status', 'pending')
    .eq('requester_id', me)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    created_at: string;
    addressee: FriendProfile;
  }>;

  return rows.map((row) => ({
    friendship_id: row.id,
    status: 'pending' as const,
    profile: row.addressee,
    created_at: row.created_at,
  }));
}

/** Devuelve el estado de la relación con `other`. Único lookup necesario en el perfil ajeno. */
export async function fetchFriendshipStatus(otherId: string): Promise<{
  status: FriendshipStatus;
  friendship_id: string | null;
}> {
  const { data: u } = await supabase.auth.getUser();
  const me = u.user?.id;
  if (!me) return { status: 'none', friendship_id: null };

  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .or(
      `and(requester_id.eq.${me},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${me})`,
    )
    .maybeSingle();
  if (error) throw error;
  if (!data) return { status: 'none', friendship_id: null };

  if (data.status === 'accepted') return { status: 'friends', friendship_id: data.id };
  if (data.status === 'pending') {
    return {
      status: data.requester_id === me ? 'pending_out' : 'pending_in',
      friendship_id: data.id,
    };
  }
  // rejected o removed → tratamos como "none" para permitir nuevas solicitudes
  return { status: 'none', friendship_id: data.id };
}

/* RPC wrappers */

export async function sendFriendRequest(targetId: string): Promise<string> {
  const { data, error } = await supabase.rpc('fn_send_friend_request', {
    p_target: targetId,
  });
  if (error) throw error;
  return data as string;
}

export async function respondFriendRequest(
  requestId: string,
  response: 'accepted' | 'rejected',
): Promise<string> {
  const { data, error } = await supabase.rpc('fn_respond_friend_request', {
    p_request_id: requestId,
    p_response: response,
  });
  if (error) throw error;
  return data as string;
}

export async function removeFriend(otherId: string): Promise<void> {
  const { error } = await supabase.rpc('fn_remove_friend', { p_other: otherId });
  if (error) throw error;
}
