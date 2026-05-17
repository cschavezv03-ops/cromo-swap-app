import { supabase } from '@/lib/supabase';
import type { Tables } from '@/shared/types/database';

/** Item enriquecido con metadatos del catálogo para mostrar en la pantalla. */
export type TransactionItemEnriched = Tables<'transaction_items'> & {
  catalog: {
    id: string;
    printed_code: string | null;
    display_name: string;
    player_name: string | null;
    jersey: number | null;
    section_code: string;
    section_number: number;
    country_code: string | null;
    country_name: string | null;
    flag_emoji: string | null;
    stripe: string | null;
    accent: string | null;
    rarity_label: string | null;
  } | null;
};

export type TransactionDetail = Tables<'transactions'> & {
  items: TransactionItemEnriched[];
  initiator: Pick<Tables<'profiles'>, 'id' | 'display_name' | 'university'> | null;
  owner: Pick<Tables<'profiles'>, 'id' | 'display_name' | 'university'> | null;
  /**
   * `whatsapp_phone` del counterparty (no de mí). Solo viene cuando la
   * transacción está `accepted`/`completed` — la view `contact_info`
   * filtra por RLS en función del estado.
   */
  counterparty_whatsapp: string | null;
  /** Mi rol en la transacción: `initiator` o `owner`. */
  my_role: 'initiator' | 'owner' | 'unknown';
};

export type TransactionListItem = Tables<'transactions'> & {
  counterparty: Pick<Tables<'profiles'>, 'id' | 'display_name' | 'university' | 'avatar_url'> | null;
  my_role: 'initiator' | 'owner';
};

async function fetchEnrichedItems(transactionId: string): Promise<TransactionItemEnriched[]> {
  const { data, error } = await supabase
    .from('transaction_items')
    .select('*')
    .eq('transaction_id', transactionId);
  if (error) throw error;
  const items = (data ?? []) as Tables<'transaction_items'>[];
  if (items.length === 0) return [];

  const cromoIds = Array.from(new Set(items.map((i) => i.cromo_id)));
  const { data: catalog, error: cErr } = await supabase
    .from('cromo_with_country_rarity')
    .select(
      'id, printed_code, display_name, player_name, jersey, section_code, section_number, country_code, country_name, flag_emoji, stripe, accent, rarity_label',
    )
    .in('id', cromoIds);
  if (cErr) throw cErr;

  const byId = new Map<string, TransactionItemEnriched['catalog']>(
    ((catalog ?? []) as NonNullable<TransactionItemEnriched['catalog']>[]).map((c) => [
      c.id,
      c,
    ]),
  );
  return items.map((it) => ({ ...it, catalog: byId.get(it.cromo_id) ?? null }));
}

async function fetchCounterpartyWhatsapp(counterpartyId: string): Promise<string | null> {
  // La view `contact_info` aplica RLS — solo devuelve filas para usuarios
  // con quienes tengo una transacción aceptada/completada.
  const { data, error } = await supabase
    .from('contact_info')
    .select('user_id, whatsapp_phone')
    .eq('user_id', counterpartyId)
    .maybeSingle();
  if (error) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[transactions] contact_info lookup failed', error.message);
    }
    return null;
  }
  return data?.whatsapp_phone ?? null;
}

/** Trae el detalle completo de una transacción (incluye items y, si aplica, WhatsApp). */
export async function fetchTransaction(id: string): Promise<TransactionDetail | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const tx = data as Tables<'transactions'>;

  const [items, profileRows] = await Promise.all([
    fetchEnrichedItems(id),
    supabase
      .from('profiles')
      .select('id, display_name, university')
      .in('id', [tx.initiator_id, tx.owner_id]),
  ]);
  if (profileRows.error) throw profileRows.error;

  const profileById = new Map((profileRows.data ?? []).map((p) => [p.id, p]));
  const my_role: TransactionDetail['my_role'] =
    uid === tx.initiator_id ? 'initiator' : uid === tx.owner_id ? 'owner' : 'unknown';

  let counterparty_whatsapp: string | null = null;
  if ((tx.status === 'accepted' || tx.status === 'completed') && uid) {
    const counterpartyId = uid === tx.initiator_id ? tx.owner_id : tx.initiator_id;
    counterparty_whatsapp = await fetchCounterpartyWhatsapp(counterpartyId);
  }

  return {
    ...tx,
    items,
    initiator: profileById.get(tx.initiator_id) ?? null,
    owner: profileById.get(tx.owner_id) ?? null,
    counterparty_whatsapp,
    my_role,
  };
}

/** Trae todas mis transacciones (como initiator o como owner) ordenadas por recientes. */
export async function fetchMyTransactions(): Promise<TransactionListItem[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .or(`initiator_id.eq.${uid},owner_id.eq.${uid}`)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Tables<'transactions'>[];
  if (rows.length === 0) return [];

  const counterpartyIds = Array.from(
    new Set(rows.map((r) => (r.initiator_id === uid ? r.owner_id : r.initiator_id))),
  );
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, display_name, university, avatar_url')
    .in('id', counterpartyIds);
  if (pErr) throw pErr;

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((r) => {
    const my_role: 'initiator' | 'owner' = r.initiator_id === uid ? 'initiator' : 'owner';
    const counterpartyId = my_role === 'initiator' ? r.owner_id : r.initiator_id;
    return { ...r, counterparty: byId.get(counterpartyId) ?? null, my_role };
  });
}

/** Crea una propuesta de trueque puro vía `fn_create_trade_proposal`. */
export async function createTradeProposal(args: {
  ownerId: string;
  offeredCromoId: string;
  requestedCromoId: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('fn_create_trade_proposal', {
    p_owner: args.ownerId,
    p_offered_cromo: args.offeredCromoId,
    p_requested_cromo: args.requestedCromoId,
  });
  if (error) throw error;
  if (!data) throw new Error('No se pudo crear la propuesta de intercambio.');
  return data;
}

export async function acceptTransaction(id: string): Promise<void> {
  const { error } = await supabase.rpc('fn_accept_transaction', { p_transaction_id: id });
  if (error) throw error;
}

export async function completeTransaction(id: string): Promise<string> {
  const { data, error } = await supabase.rpc('fn_complete_transaction', {
    p_transaction_id: id,
  });
  if (error) throw error;
  return data ?? id;
}

export async function cancelTransaction(id: string, reason?: string): Promise<void> {
  const { error } = await supabase.rpc('fn_cancel_transaction', {
    p_transaction_id: id,
    p_reason: reason,
  });
  if (error) throw error;
}
