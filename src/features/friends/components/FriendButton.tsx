import { Text, View } from 'react-native';

import { Button, useToast } from '@/ui';

import {
  useFriendshipStatus,
  useRemoveFriend,
  useRespondFriendRequest,
  useSendFriendRequest,
} from '../hooks/useFriends';

type Props = {
  targetUserId: string;
  /** Variante visual: 'cta' (botones grandes en perfil) o 'inline' (chip pequeño en listas). */
  variant?: 'cta' | 'inline';
};

/**
 * Botón polimórfico que muestra el estado de amistad y la acción correspondiente.
 *
 *   none         → "Agregar como amigo"
 *   pending_out  → "Solicitud enviada" (deshabilitado)
 *   pending_in   → "Aceptar" + "Rechazar"
 *   friends      → "Quitar amigo" (variante danger)
 */
export function FriendButton({ targetUserId, variant = 'cta' }: Props) {
  const toast = useToast();
  const statusQ = useFriendshipStatus(targetUserId);
  const send = useSendFriendRequest();
  const respond = useRespondFriendRequest();
  const remove = useRemoveFriend();

  if (statusQ.isLoading) return null;
  const state = statusQ.data?.status ?? 'none';
  const fid = statusQ.data?.friendship_id ?? null;

  const handleSend = async () => {
    try {
      await send.mutateAsync(targetUserId);
      toast.show('Solicitud enviada.', 'success');
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'No se pudo enviar.', 'danger');
    }
  };

  const handleRespond = async (response: 'accepted' | 'rejected') => {
    if (!fid) return;
    try {
      await respond.mutateAsync({ requestId: fid, response });
      toast.show(response === 'accepted' ? 'Ahora son amigos.' : 'Solicitud rechazada.', 'success');
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'No se pudo responder.', 'danger');
    }
  };

  const handleRemove = async () => {
    try {
      await remove.mutateAsync(targetUserId);
      toast.show('Amistad eliminada.', 'info');
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'No se pudo quitar.', 'danger');
    }
  };

  if (state === 'none') {
    return (
      <Button
        label="Agregar como amigo"
        onPress={handleSend}
        loading={send.isPending}
        size={variant === 'inline' ? 'sm' : 'md'}
      />
    );
  }

  if (state === 'pending_out') {
    return (
      <View
        className="items-center justify-center rounded-md border border-border bg-surface"
        style={{ height: variant === 'inline' ? 36 : 44, paddingHorizontal: 16 }}
      >
        <Text className="text-sm font-sans-semibold text-text-tertiary">
          Solicitud enviada
        </Text>
      </View>
    );
  }

  if (state === 'pending_in') {
    return (
      <View className="flex-row gap-2">
        <View style={{ flex: 1 }}>
          <Button
            label="Aceptar"
            size={variant === 'inline' ? 'sm' : 'md'}
            loading={respond.isPending}
            onPress={() => handleRespond('accepted')}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Rechazar"
            variant="secondary"
            size={variant === 'inline' ? 'sm' : 'md'}
            loading={respond.isPending}
            onPress={() => handleRespond('rejected')}
          />
        </View>
      </View>
    );
  }

  // friends
  return (
    <Button
      label="Quitar amigo"
      variant="secondary"
      size={variant === 'inline' ? 'sm' : 'md'}
      loading={remove.isPending}
      onPress={handleRemove}
    />
  );
}
