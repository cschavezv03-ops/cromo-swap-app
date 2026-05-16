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
};

/**
 * Lee el perfil + stats de inventario de otro usuario. RLS:
 *   - profiles.profiles_read_others: visible si está en scope o ya hay
 *     transacción aceptada.
 *   - inventory_items: similares políticas. Si la RLS lo bloquea, las
 *     stats salen en 0.
 */
export async function fetchOtherProfile(userId: string): Promise<OtherProfile | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!profile) return null;

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

  return { profile, inventory_stats: stats };
}
