import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { FriendRow } from '@/features/friends/components/FriendRow';
import {
  useMyFriends,
  usePendingIn,
  usePendingOut,
  useRespondFriendRequest,
} from '@/features/friends/hooks/useFriends';
import { Button, Chip, EmptyState, Screen, ScreenHeader, Skeleton, useToast } from '@/ui';

type Tab = 'friends' | 'pending';

export default function FriendsScreen() {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('friends');

  const friends = useMyFriends();
  const pendingIn = usePendingIn();
  const pendingOut = usePendingOut();
  const respond = useRespondFriendRequest();

  const counts = useMemo(
    () => ({
      friends: friends.data?.length ?? 0,
      pending: (pendingIn.data?.length ?? 0) + (pendingOut.data?.length ?? 0),
    }),
    [friends.data, pendingIn.data, pendingOut.data],
  );

  const handleRespond = async (requestId: string, response: 'accepted' | 'rejected') => {
    try {
      await respond.mutateAsync({ requestId, response });
      toast.show(
        response === 'accepted' ? 'Ahora son amigos.' : 'Solicitud rechazada.',
        'success',
      );
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'No se pudo responder.', 'danger');
    }
  };

  return (
    <Screen>
      <View className="flex-row items-center px-5 pt-2 pb-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="-ml-1 h-9 w-9 items-center justify-center rounded-md"
        >
          <Text className="text-text-primary text-xl">←</Text>
        </Pressable>
        <Text className="flex-1 text-center text-base font-sans-bold text-text-primary">
          Amigos
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <View className="flex-row gap-2 px-5 pb-3">
        <Chip
          label="Amigos"
          count={counts.friends}
          variant={tab === 'friends' ? 'selected' : 'default'}
          size="sm"
          onPress={() => setTab('friends')}
        />
        <Chip
          label="Solicitudes"
          count={counts.pending}
          variant={tab === 'pending' ? 'selected' : 'default'}
          size="sm"
          onPress={() => setTab('pending')}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {tab === 'friends' && (
          <>
            {friends.isLoading ? (
              <View className="px-5 gap-3 mt-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} width="100%" height={48} rounded="md" />
                ))}
              </View>
            ) : (friends.data ?? []).length === 0 ? (
              <EmptyState
                title="Aún no tienes amigos"
                description="Cuando alguien acepte tu solicitud aparecerá aquí. También puedes buscar usuarios o agregar gente desde sus perfiles."
              />
            ) : (
              friends.data!.map((f, i, arr) => (
                <FriendRow
                  key={f.friendship_id}
                  displayName={f.profile.display_name}
                  avatarUrl={f.profile.avatar_url}
                  universityId={f.profile.university}
                  albumPct={f.profile.album_pct}
                  isLast={i === arr.length - 1}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/profile/[id]',
                      params: { id: f.profile.id },
                    })
                  }
                />
              ))
            )}
          </>
        )}

        {tab === 'pending' && (
          <>
            {(pendingIn.data ?? []).length > 0 && (
              <View>
                <Text className="mt-4 mb-2 px-5 text-[11px] font-sans-semibold uppercase tracking-[0.18em] text-text-tertiary">
                  Recibidas
                </Text>
                {pendingIn.data!.map((f, i, arr) => (
                  <FriendRow
                    key={f.friendship_id}
                    displayName={f.profile.display_name}
                    avatarUrl={f.profile.avatar_url}
                    universityId={f.profile.university}
                    albumPct={f.profile.album_pct}
                    isLast={i === arr.length - 1}
                    onPress={() =>
                      router.push({
                        pathname: '/(app)/profile/[id]',
                        params: { id: f.profile.id },
                      })
                    }
                    rightSlot={
                      <View className="flex-row gap-1">
                        <Button
                          label="Aceptar"
                          size="sm"
                          loading={respond.isPending}
                          onPress={() => handleRespond(f.friendship_id, 'accepted')}
                        />
                        <Button
                          label="No"
                          variant="secondary"
                          size="sm"
                          loading={respond.isPending}
                          onPress={() => handleRespond(f.friendship_id, 'rejected')}
                        />
                      </View>
                    }
                  />
                ))}
              </View>
            )}

            {(pendingOut.data ?? []).length > 0 && (
              <View>
                <Text className="mt-4 mb-2 px-5 text-[11px] font-sans-semibold uppercase tracking-[0.18em] text-text-tertiary">
                  Enviadas
                </Text>
                {pendingOut.data!.map((f, i, arr) => (
                  <FriendRow
                    key={f.friendship_id}
                    displayName={f.profile.display_name}
                    avatarUrl={f.profile.avatar_url}
                    universityId={f.profile.university}
                    albumPct={f.profile.album_pct}
                    isLast={i === arr.length - 1}
                    onPress={() =>
                      router.push({
                        pathname: '/(app)/profile/[id]',
                        params: { id: f.profile.id },
                      })
                    }
                    rightSlot={
                      <Text className="text-xs font-sans-medium text-text-tertiary">
                        Pendiente
                      </Text>
                    }
                  />
                ))}
              </View>
            )}

            {!pendingIn.isLoading &&
              !pendingOut.isLoading &&
              (pendingIn.data ?? []).length === 0 &&
              (pendingOut.data ?? []).length === 0 && (
                <EmptyState
                  title="Sin solicitudes"
                  description="Cuando alguien te envíe una solicitud o tú envíes una, aparecerá aquí."
                />
              )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
