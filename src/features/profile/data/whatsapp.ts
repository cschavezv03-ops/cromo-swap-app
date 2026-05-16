import { supabase } from '@/lib/supabase';
import type { Tables } from '@/shared/types/database';
import { WHATSAPP_PHONE_REGEX } from '@/shared/utils/whatsapp';

export type ProfileContact = Tables<'profile_contacts'>;

/**
 * Trae el teléfono de WhatsApp del usuario autenticado. Devuelve `null`
 * si nunca lo guardó. Las RLS de `profile_contacts` solo permiten que el
 * dueño lea su propia fila (la contraparte ve el número vía la view
 * `contact_info` recién cuando la transacción está aceptada).
 */
export async function getMyWhatsApp(): Promise<ProfileContact | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;

  const { data, error } = await supabase
    .from('profile_contacts')
    .select('*')
    .eq('user_id', uid)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Guarda o actualiza el WhatsApp del usuario autenticado. Aplica la
 * misma validación E.164 que el CHECK constraint server-side, así fallamos
 * temprano con un mensaje en español.
 */
export async function setMyWhatsApp(phone: string): Promise<ProfileContact> {
  const trimmed = phone.trim();
  if (!WHATSAPP_PHONE_REGEX.test(trimmed)) {
    throw new Error(
      'El número de WhatsApp debe tener el formato internacional. Ejemplo: +593987654321.',
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('No tienes sesión activa.');

  const { data, error } = await supabase
    .from('profile_contacts')
    .upsert(
      { user_id: uid, whatsapp_phone: trimmed },
      { onConflict: 'user_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
