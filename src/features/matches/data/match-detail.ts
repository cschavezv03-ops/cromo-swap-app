import { supabase } from '@/lib/supabase';
import type { Tables } from '@/shared/types/database';

/**
 * Datos del cromo enriquecidos para el grid de detalle de match. Es un
 * subset de la view `cromo_with_country_rarity` más la cantidad
 * disponible del dueño actual (mía o suya según el bucket).
 */
export type MatchableCromo = {
  id: string;
  printed_code: string;
  display_name: string;
  player_name: string | null;
  jersey: number | null;
  position: string | null;
  section_code: string;
  section_number: number;
  country_code: string | null;
  country_name: string | null;
  flag_emoji: string | null;
  stripe: string | null;
  accent: string | null;
  rarity_id: string;
  rarity_label: string | null;
  /** Cantidad disponible (owned) del dueño del bucket: mía si soy yo, suya si no. */
  available_quantity: number;
};

export type MatchDetail = {
  counterpartyId: string;
  counterparty: Pick<Tables<'profiles'>, 'id' | 'display_name' | 'university'> | null;
  /** Cromos que yo (viewer) tengo repetidos y al otro le faltan. */
  iCanGive: MatchableCromo[];
  /** Cromos que el otro tiene repetidos y a mí me faltan. */
  iCanGet: MatchableCromo[];
};

type InventoryRow = Pick<
  Tables<'inventory_items'>,
  'cromo_id' | 'owned_quantity' | 'status' | 'user_id'
>;

type CatalogRow = {
  id: string;
  printed_code: string | null;
  display_name: string;
  player_name: string | null;
  jersey: number | null;
  position: string | null;
  section_code: string;
  section_number: number;
  country_code: string | null;
  country_name: string | null;
  flag_emoji: string | null;
  stripe: string | null;
  accent: string | null;
  rarity_id: string;
  rarity_label: string | null;
};

/**
 * Calcula los dos buckets de intercambio para un counterparty:
 *   iCanGive → cromos donde MIO.status='repeated' AND OTRO.status='missing'.
 *   iCanGet  → cromos donde OTRO.status='repeated' AND MIO.status='missing'.
 *
 * Hace 3 queries: mi inventario, su inventario, y catálogo enriquecido.
 * Las primeras dos respetan RLS — `inventory_items` permite SELECT a
 * cualquier autenticado (la privacidad real vive en `profile_contacts`).
 */
export async function fetchMatchableCromos(counterpartyId: string): Promise<MatchDetail> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) {
    return { counterpartyId, counterparty: null, iCanGive: [], iCanGet: [] };
  }

  // 1) Traer profile del otro (para header del detalle).
  const { data: profileData, error: profileErr } = await supabase
    .from('profiles')
    .select('id, display_name, university')
    .eq('id', counterpartyId)
    .maybeSingle();
  if (profileErr) throw profileErr;

  // 2) Mis filas y sus filas. Solo necesitamos status + owned.
  const [{ data: mine, error: mineErr }, { data: theirs, error: theirsErr }] = await Promise.all([
    supabase
      .from('inventory_items')
      .select('cromo_id, owned_quantity, status, user_id')
      .eq('user_id', uid),
    supabase
      .from('inventory_items')
      .select('cromo_id, owned_quantity, status, user_id')
      .eq('user_id', counterpartyId),
  ]);
  if (mineErr) throw mineErr;
  if (theirsErr) throw theirsErr;

  const mineRows = (mine ?? []) as InventoryRow[];
  const theirRows = (theirs ?? []) as InventoryRow[];
  const mineByCromo = new Map(mineRows.map((r) => [r.cromo_id, r]));
  const theirByCromo = new Map(theirRows.map((r) => [r.cromo_id, r]));

  // Un cromo del otro con status='missing' significa que tiene fila con
  // owned=0 explícita. Para que cuente como "yo le puedo dar X" el otro
  // debe haber registrado el faltante (mismo criterio que matches_suggestions).
  const giveIds: string[] = [];
  for (const [cromoId, row] of mineByCromo) {
    if (row.status !== 'repeated') continue;
    const theirRow = theirByCromo.get(cromoId);
    if (theirRow && theirRow.status === 'missing') {
      giveIds.push(cromoId);
    }
  }

  const getIds: string[] = [];
  for (const [cromoId, row] of theirByCromo) {
    if (row.status !== 'repeated') continue;
    const mineRow = mineByCromo.get(cromoId);
    // Si yo no tengo fila o tengo status='missing', a mí me falta.
    if (!mineRow || mineRow.status === 'missing') {
      getIds.push(cromoId);
    }
  }

  const allIds = Array.from(new Set([...giveIds, ...getIds]));
  if (allIds.length === 0) {
    return {
      counterpartyId,
      counterparty: profileData ?? null,
      iCanGive: [],
      iCanGet: [],
    };
  }

  // 3) Catálogo enriquecido.
  const { data: catalog, error: catErr } = await supabase
    .from('cromo_with_country_rarity')
    .select(
      'id, printed_code, display_name, player_name, jersey, position, section_code, section_number, country_code, country_name, flag_emoji, stripe, accent, rarity_id, rarity_label',
    )
    .in('id', allIds);
  if (catErr) throw catErr;

  const catalogById = new Map<string, CatalogRow>(
    ((catalog ?? []) as CatalogRow[]).map((c) => [c.id, c]),
  );

  const toMatchable = (cromoId: string, source: Map<string, InventoryRow>): MatchableCromo | null => {
    const cat = catalogById.get(cromoId);
    if (!cat) return null;
    const inv = source.get(cromoId);
    return {
      id: cat.id,
      printed_code: cat.printed_code ?? '',
      display_name: cat.display_name,
      player_name: cat.player_name,
      jersey: cat.jersey,
      position: cat.position,
      section_code: cat.section_code,
      section_number: cat.section_number,
      country_code: cat.country_code,
      country_name: cat.country_name,
      flag_emoji: cat.flag_emoji,
      stripe: cat.stripe,
      accent: cat.accent,
      rarity_id: cat.rarity_id,
      rarity_label: cat.rarity_label,
      available_quantity: inv?.owned_quantity ?? 0,
    };
  };

  const iCanGive = giveIds
    .map((id) => toMatchable(id, mineByCromo))
    .filter((x): x is MatchableCromo => x !== null)
    .sort(sortByPrintedCode);
  const iCanGet = getIds
    .map((id) => toMatchable(id, theirByCromo))
    .filter((x): x is MatchableCromo => x !== null)
    .sort(sortByPrintedCode);

  return {
    counterpartyId,
    counterparty: profileData ?? null,
    iCanGive,
    iCanGet,
  };
}

function sortByPrintedCode(a: MatchableCromo, b: MatchableCromo): number {
  if (a.section_code !== b.section_code) {
    return a.section_code.localeCompare(b.section_code);
  }
  return a.section_number - b.section_number;
}
