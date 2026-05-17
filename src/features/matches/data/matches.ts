import { supabase } from '@/lib/supabase';
import type { Json, Tables, Views } from '@/shared/types/database';

/** Row de `matches_suggestions` enriquecida con el perfil del candidato. */
export type MatchSuggestion = Views<'matches_suggestions'> & {
  profile: Pick<Tables<'profiles'>, 'id' | 'display_name' | 'university' | 'avatar_url'> | null;
};

/** Match guardado en `matches` con el perfil del otro usuario y mi rol. */
export type MatchRow = Tables<'matches'> & {
  counterparty: Pick<Tables<'profiles'>, 'id' | 'display_name' | 'university' | 'avatar_url'> | null;
  /** `'a'` si yo soy `user_a_id`, `'b'` si soy `user_b_id`. */
  role: 'a' | 'b';
};

/**
 * Trae los candidatos de match desde la view `matches_suggestions`. La
 * view ya filtra por `auth.uid()`, scope e intersección de blocks, así
 * que solo recibimos counterparties válidos.
 */
export async function fetchMatchSuggestions(): Promise<MatchSuggestion[]> {
  const { data, error } = await supabase
    .from('matches_suggestions')
    .select('counterparty_id, university, give_count, get_count, match_type, sort_key')
    .order('sort_key', { ascending: true })
    .order('give_count', { ascending: false })
    .order('get_count', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as Views<'matches_suggestions'>[];
  const ids = rows
    .map((r) => r.counterparty_id)
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) return [];

  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, display_name, university, avatar_url')
    .in('id', ids);
  if (pErr) throw pErr;

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((row) => ({
    ...row,
    profile: row.counterparty_id ? byId.get(row.counterparty_id) ?? null : null,
  }));
}

export type MatchDirection = 'sent' | 'received';

/**
 * Trae los matches en los que estoy involucrado en una dirección dada.
 * `sent`     → yo soy `user_a_id` (yo lo propuse).
 * `received` → yo soy `user_b_id` (me lo propusieron).
 * Filtra a `pending` y `mutual` para esconder los `cancelled`/`expired`.
 */
export async function fetchMyMatches(direction: MatchDirection): Promise<MatchRow[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];

  const meColumn = direction === 'sent' ? 'user_a_id' : 'user_b_id';
  const otherColumn = direction === 'sent' ? 'user_b_id' : 'user_a_id';
  const role: 'a' | 'b' = direction === 'sent' ? 'a' : 'b';

  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq(meColumn, uid)
    .in('status', ['pending', 'mutual'])
    .order('updated_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as Tables<'matches'>[];
  const otherIds = Array.from(
    new Set(rows.map((r) => (otherColumn === 'user_a_id' ? r.user_a_id : r.user_b_id))),
  );
  if (otherIds.length === 0) return [];

  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, display_name, university, avatar_url')
    .in('id', otherIds);
  if (pErr) throw pErr;

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((r) => {
    const otherId = otherColumn === 'user_a_id' ? r.user_a_id : r.user_b_id;
    return { ...r, counterparty: byId.get(otherId) ?? null, role };
  });
}

export type ProposeMatchArgs = {
  targetUserId: string;
  matchType?: string;
  giveCount?: number;
  getCount?: number;
  matchScore?: number;
  listingId?: string;
  reason?: Json;
};

/**
 * Wrap `fn_propose_match`. Devuelve el `match_id` creado.
 * NOTA: el RPC encapsula RLS, scope y dedup — del lado del cliente solo
 * mandamos los counts/tipo y dejamos que el backend valide.
 */
export async function proposeMatch(args: ProposeMatchArgs): Promise<string> {
  const { data, error } = await supabase.rpc('fn_propose_match', {
    p_target: args.targetUserId,
    p_match_type: args.matchType,
    p_give_count: args.giveCount,
    p_get_count: args.getCount,
    p_match_score: args.matchScore,
    p_listing_id: args.listingId,
    p_reason: args.reason,
  });
  if (error) throw error;
  if (!data) throw new Error('No se pudo crear el match.');
  return data;
}

export type MatchResponse = 'accepted' | 'rejected';

/** Wrap `fn_respond_match`. Devuelve el `match_id`. */
export async function respondMatch(args: {
  matchId: string;
  response: MatchResponse;
}): Promise<string> {
  const { data, error } = await supabase.rpc('fn_respond_match', {
    p_match_id: args.matchId,
    p_response: args.response,
  });
  if (error) throw error;
  if (!data) throw new Error('No se pudo registrar la respuesta.');
  return data;
}
