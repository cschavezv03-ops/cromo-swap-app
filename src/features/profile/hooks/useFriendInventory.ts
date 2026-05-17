import { useQuery } from '@tanstack/react-query';

import { fetchFriendInventory, type FriendInventoryKind } from '../data/friend-inventory';

export function useFriendInventory(
  userId: string | null | undefined,
  kind: FriendInventoryKind,
  enabled = true,
) {
  return useQuery({
    queryKey: ['friend-inventory', userId ?? 'none', kind],
    enabled: Boolean(userId) && enabled,
    queryFn: () => fetchFriendInventory(userId!, kind),
    staleTime: 1000 * 60,
  });
}
