import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useSession } from '@/features/auth/hooks/useSession';
import { supabase } from '@/lib/supabase';

/**
 * Suscribe al usuario autenticado a cambios en `transactions`,
 * `matches` y `notifications` para que las queries se refresquen sin
 * necesidad de pull-to-refresh. Filtramos del lado de Postgres por
 * `user_id` / `initiator_id` / `owner_id` para minimizar tráfico.
 *
 * Pensado para vivir UNA sola vez bajo `app/(app)/_layout.tsx`.
 */
export function useRealtimeBridge(): void {
  const { user } = useSession();
  const qc = useQueryClient();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`rt-bridge-${userId}`);

    // Transactions donde soy initiator…
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'transactions', filter: `initiator_id=eq.${userId}` },
      (payload) => {
        const id = (payload.new as { id?: string } | null)?.id ?? (payload.old as { id?: string } | null)?.id;
        if (id) {
          void qc.invalidateQueries({ queryKey: ['transactions', 'detail', id] });
        }
        void qc.invalidateQueries({ queryKey: ['transactions', 'mine'] });
      },
    );

    // …o donde soy owner.
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'transactions', filter: `owner_id=eq.${userId}` },
      (payload) => {
        const id = (payload.new as { id?: string } | null)?.id ?? (payload.old as { id?: string } | null)?.id;
        if (id) {
          void qc.invalidateQueries({ queryKey: ['transactions', 'detail', id] });
        }
        void qc.invalidateQueries({ queryKey: ['transactions', 'mine'] });
      },
    );

    // Matches donde soy user_a o user_b.
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'matches', filter: `user_a_id=eq.${userId}` },
      () => {
        void qc.invalidateQueries({ queryKey: ['matches'] });
      },
    );
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'matches', filter: `user_b_id=eq.${userId}` },
      () => {
        void qc.invalidateQueries({ queryKey: ['matches'] });
      },
    );

    // Notificaciones del usuario.
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      () => {
        void qc.invalidateQueries({ queryKey: ['notifications'] });
      },
    );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}
