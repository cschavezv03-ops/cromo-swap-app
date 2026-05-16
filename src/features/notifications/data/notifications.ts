import { supabase } from '@/lib/supabase';
import type { Tables } from '@/shared/types/database';

export type Notification = Tables<'notifications'>;

/** Tipos de notificación que el server emite (private.emit_*_notification). */
export type NotificationPayload = {
  match_id?: string;
  transaction_id?: string;
  counterparty_id?: string;
  counterparty_name?: string;
  cromo_count?: number;
};

export async function fetchMyNotifications(): Promise<Notification[]> {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) return;

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
}
