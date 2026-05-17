import { supabase } from '@/lib/supabase';

export type RatingSummary = {
  total: number;
  avg_stars: number;
};

/** Crea (o reutiliza) un rating del usuario actual sobre `transactionId`. */
export async function createRating(args: {
  transactionId: string;
  stars: number;
  comment?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('fn_create_rating', {
    p_transaction_id: args.transactionId,
    p_stars: args.stars,
    p_comment: args.comment ?? null,
  });
  if (error) throw error;
  return data as string;
}

/** ¿Ya califiqué esta transacción? */
export async function fetchMyRatingForTx(transactionId: string): Promise<{
  exists: boolean;
  stars?: number;
  comment?: string | null;
}> {
  const { data: u } = await supabase.auth.getUser();
  const me = u.user?.id;
  if (!me) return { exists: false };

  const { data, error } = await supabase
    .from('ratings')
    .select('stars, comment')
    .eq('transaction_id', transactionId)
    .eq('rater_id', me)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { exists: false };
  return { exists: true, stars: data.stars, comment: data.comment };
}

/** Resumen agregado (promedio + total) para un user. RLS aplica. */
export async function fetchRatingSummary(userId: string): Promise<RatingSummary | null> {
  const { data, error } = await supabase
    .from('rating_summary')
    .select('total, avg_stars')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as RatingSummary | null;
}
