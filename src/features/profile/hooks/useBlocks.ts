import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { blockUser, fetchMyBlocks, isBlocked, unblockUser } from '../data/blocks';

const KEY = ['profile', 'blocks'] as const;

export function useMyBlocks() {
  return useQuery({
    queryKey: KEY,
    queryFn: fetchMyBlocks,
    staleTime: 1000 * 30,
  });
}

export function useIsBlocked(targetUserId: string | null | undefined) {
  return useQuery({
    queryKey: ['profile', 'blocks', 'is', targetUserId ?? 'none'],
    enabled: Boolean(targetUserId),
    queryFn: () => isBlocked(targetUserId!),
    staleTime: 1000 * 30,
  });
}

/**
 * Invalidación completa tras block/unblock. El bloqueo afecta:
 *   - Profile del bloqueado (other-profile)
 *   - Lista de amigos (puede haber friendship rota)
 *   - Matches y suggestions
 *   - Búsqueda de usuarios (no debe aparecer en results)
 *   - Avisos / notifications (algunas pueden quedar invalidadas)
 *
 * Sin invalidar TODO esto el UI queda mostrando data stale del bloqueado
 * (perfil, avatar, listings) → "se daña todo" como reportó el usuario.
 */
function invalidateBlockRelated(
  qc: ReturnType<typeof useQueryClient>,
  targetUserId: string,
) {
  void qc.invalidateQueries({ queryKey: ['profile', 'blocks'] });
  void qc.invalidateQueries({ queryKey: ['other-profile', targetUserId] });
  void qc.invalidateQueries({ queryKey: ['friends'] });
  void qc.invalidateQueries({ queryKey: ['matches'] });
  void qc.invalidateQueries({ queryKey: ['profile-search'] });
  void qc.invalidateQueries({ queryKey: ['marketplace', 'active'] });
  void qc.invalidateQueries({ queryKey: ['notifications'] });
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: blockUser,
    onSuccess: (_v, targetUserId) => invalidateBlockRelated(qc, targetUserId),
  });
}

export function useUnblockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: unblockUser,
    onSuccess: (_v, targetUserId) => invalidateBlockRelated(qc, targetUserId),
  });
}
