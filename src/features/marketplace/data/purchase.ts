import { supabase } from '@/lib/supabase';

/**
 * Pide una compra (sale o package). Devuelve el id de la transacción
 * recién creada (status='pending' a la espera de aceptación del vendedor).
 */
export async function createPurchaseRequest(listingId: string): Promise<string> {
  const { data, error } = await supabase.rpc('fn_create_purchase_request', {
    p_listing_id: listingId,
  });
  if (error) throw error;
  if (!data) throw new Error('No se pudo solicitar la compra.');
  return data as string;
}
