import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';

import {
  getMyWhatsApp,
  setMyWhatsApp,
  type ProfileContact,
} from '../data/whatsapp';

const QUERY_KEY = ['profile', 'whatsapp'] as const;

export function useMyWhatsApp() {
  const { user, isLoading: sessionLoading } = useSession();
  const userId = user?.id;

  return useQuery({
    queryKey: [...QUERY_KEY, userId ?? 'none'],
    enabled: Boolean(userId) && !sessionLoading,
    queryFn: getMyWhatsApp,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSetMyWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (phone: string) => setMyWhatsApp(phone),
    onSuccess: (data: ProfileContact) => {
      qc.setQueryData([...QUERY_KEY, data.user_id], data);
      void qc.invalidateQueries({ queryKey: ['profile', 'whatsapp'] });
    },
  });
}
