import { supabase } from '@/lib/supabase';
import type { Tables } from '@/shared/types/database';

export type OtherProfile = {
  profile: Tables<'profiles'>;
  inventory_stats: {
    have: number;
    repeated: number;
    missing: number;
    total: number;
  };
  /** true cuando obtuvimos solo la vista pública mínima (RLS bloqueó full). */
  is_minimal: boolean;
};

/**
 * Lee el perfil + stats de inventario de otro usuario.
 *
 * RLS de profiles_read_others permite ver el perfil completo solo si:
 *   - está en scope, OR
 *   - somos amigos, OR
 *   - ya hicimos transacción aceptada.
 *
 * Cuando NADA de eso aplica (ej. encontrado via búsqueda global) hacemos
 * fallback a `fn_get_user_card` que devuelve la vista pública mínima
 * (gated solo por bloqueos). En ese caso `is_minimal = true` y las stats
 * vienen en cero.
 */
export async function fetchOtherProfile(userId: string): Promise<OtherProfile | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;

  if (profile) {
    const stats = { have: 0, repeated: 0, missing: 0, total: 0 };
    const { data: rows } = await supabase
      .from('inventory_items')
      .select('status')
      .eq('user_id', userId);
    for (const r of rows ?? []) {
      stats.total++;
      if (r.status === 'repeated') stats.repeated++;
      else if (r.status === 'missing') stats.missing++;
      else stats.have++;
    }
    return { profile, inventory_stats: stats, is_minimal: false };
  }

  // Fallback: vista pública mínima (encontrado via búsqueda global).
  const { data: card, error: cardError } = await supabase.rpc('fn_get_user_card', {
    p_user_id: userId,
  });
  if (cardError) throw cardError;
  const cardRow = Array.isArray(card) ? card[0] : null;
  if (!cardRow) return null;

  // Reconstruimos un Profile parcial con los campos mínimos para que el
  // componente que lo consume no se rompa. Los campos faltantes los
  // marcamos con defaults seguros.
  const minimalProfile: Tables<'profiles'> = {
    id: cardRow.id,
    display_name: cardRow.display_name,
    university: cardRow.university,
    album_pct: cardRow.album_pct,
    avatar_url: cardRow.avatar_url,
    scope: [],
    is_anonymous: false,
    auction_blocked_until: null,
    expo_push_token: null,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  };
  return {
    profile: minimalProfile,
    inventory_stats: { have: 0, repeated: 0, missing: 0, total: 0 },
    is_minimal: true,
  };
}
