import { useQuery } from '@tanstack/react-query';

import { fetchOtherProfile } from '../data/other-profile';

export function useOtherProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['other-profile', userId ?? 'none'],
    enabled: Boolean(userId),
    queryFn: () => fetchOtherProfile(userId!),
    staleTime: 1000 * 60,
  });
}
