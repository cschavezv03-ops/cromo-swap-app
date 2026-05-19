import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../data/notifications';

const KEY = ['notifications', 'mine'] as const;

export function useMyNotifications() {
  return useQuery({
    queryKey: KEY,
    queryFn: fetchMyNotifications,
    staleTime: 1000 * 30,
    refetchOnMount: 'always',
    // Polling cada 45s mientras la pantalla esté visible. Realtime sigue
    // siendo la fuente primaria (más rápido), esto es safety net.
    refetchInterval: 1000 * 45,
    refetchIntervalInBackground: false,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUnreadNotificationsCount(): number {
  const q = useMyNotifications();
  return (q.data ?? []).filter((n) => !n.read).length;
}
