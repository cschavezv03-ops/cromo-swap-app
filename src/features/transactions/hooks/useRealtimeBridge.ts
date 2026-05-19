import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useSession } from '@/features/auth/hooks/useSession';
import { albumQueryKey } from '@/features/album/hooks/useAlbumData';
import { pullRemoteInventory } from '@/features/album/data/inventory';
import { supabase } from '@/lib/supabase';

/**
 * Suscribe al usuario autenticado a cambios en `transactions`, `matches`,
 * `notifications` y `friendships`. Las queries se refrescan sin necesidad
 * de pull-to-refresh.
 *
 * Robustez agregada:
 *   - Cuando la app pasa a background → foreground, re-invalida queries
 *     críticas (defensa por si el channel realtime se cayó en background)
 *   - También dispara un pull del inventario remoto al volver al foreground
 *     para reflejar cambios que otros devices hicieron mientras estábamos
 *     fuera.
 *
 * Pensado para vivir UNA sola vez bajo `app/(app)/_layout.tsx`.
 */
export function useRealtimeBridge(): void {
  const { user } = useSession();
  const qc = useQueryClient();
  const userId = user?.id;
  const lastAppState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`rt-bridge-${userId}`);

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

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      () => {
        void qc.invalidateQueries({ queryKey: ['notifications'] });
      },
    );

    // Friendships: cambios en cualquier dirección (requester o addressee).
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'friendships', filter: `requester_id=eq.${userId}` },
      () => {
        void qc.invalidateQueries({ queryKey: ['friends'] });
      },
    );
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${userId}` },
      () => {
        void qc.invalidateQueries({ queryKey: ['friends'] });
      },
    );

    channel.subscribe();

    // AppState: cuando volvemos a foreground tras background, asumimos que el
    // channel pudo haberse caído y/o que perdimos eventos. Invalidamos todas
    // las queries críticas y disparamos un pull del inventario.
    const appStateSub = AppState.addEventListener('change', (next) => {
      const prev = lastAppState.current;
      lastAppState.current = next;
      if (prev.match(/inactive|background/) && next === 'active') {
        void qc.invalidateQueries({ queryKey: ['transactions'] });
        void qc.invalidateQueries({ queryKey: ['matches'] });
        void qc.invalidateQueries({ queryKey: ['notifications'] });
        void qc.invalidateQueries({ queryKey: ['friends'] });
        void qc.invalidateQueries({ queryKey: ['marketplace', 'active'] });
        // Pull del inventario remoto (best-effort)
        void pullRemoteInventory()
          .then((n) => {
            if (n > 0) void qc.invalidateQueries({ queryKey: albumQueryKey });
          })
          .catch(() => {
            /* offline */
          });
      }
    });

    return () => {
      void supabase.removeChannel(channel);
      appStateSub.remove();
    };
  }, [userId, qc]);
}
