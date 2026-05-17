import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { universitiesById } from '@/features/auth/lib/universities';
import { useSession } from '@/features/auth/hooks/useSession';
import { FriendButton } from '@/features/friends/components/FriendButton';
import { useFriendshipStatus } from '@/features/friends/hooks/useFriends';
import {
  BlockSheet,
  type BlockSheetHandle,
} from '@/features/profile/components/BlockSheet';
import { useIsBlocked, useUnblockUser } from '@/features/profile/hooks/useBlocks';
import { useOtherProfile } from '@/features/profile/hooks/useOtherProfile';
import { Button, Card, EmptyState, ProgressRing, Screen, Skeleton, useToast } from '@/ui';

export default function OtherProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const blockSheet = useRef<BlockSheetHandle>(null);

  const other = useOtherProfile(id);
  const blocked = useIsBlocked(id);
  const friendship = useFriendshipStatus(id);
  const unblock = useUnblockUser();

  const isSelf = user?.id === id;
  const profile = other.data?.profile ?? null;
  const stats = other.data?.inventory_stats;
  const albumPct = stats && stats.total > 0 ? (stats.have + stats.repeated) / stats.total : 0;
  const uni = profile?.university ? universitiesById[profile.university] : null;
  const isFriend = friendship.data?.status === 'friends';

  const handleUnblock = async () => {
    if (!id) return;
    try {
      await unblock.mutateAsync(id);
      toast.show('Usuario desbloqueado.', 'success');
    } catch {
      toast.show('No se pudo desbloquear.', 'danger');
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
          Perfil
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 16 }}>
        {other.isLoading && (
          <>
            <Skeleton width="100%" height={120} rounded="lg" />
            <Skeleton width="100%" height={80} rounded="lg" />
          </>
        )}

        {!other.isLoading && !profile && (
          <EmptyState
            title="Perfil no disponible"
            description="Este usuario no está en tu scope o fue eliminado."
          />
        )}

        {profile && (
          <>
            {/* Encabezado: avatar + nombre + uni — visible siempre */}
            <Card variant="elevated">
              <View className="flex-row items-center gap-4">
                <View className="h-16 w-16 items-center justify-center rounded-pill bg-surface">
                  <Text className="text-2xl font-sans-bold text-text-primary">
                    {profile.display_name?.[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-sans-bold text-text-primary">
                    {profile.display_name ?? '—'}
                  </Text>
                  {uni && (
                    <Text
                      className="mt-0.5 text-sm font-sans-semibold"
                      style={{ color: uni.color }}
                    >
                      {uni.short} · {uni.name}
                    </Text>
                  )}
                  {isFriend && (
                    <View className="mt-1 flex-row items-center">
                      <Text className="text-xs font-sans-semibold text-success">
                        ✓ Amigos
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Card>

            {/* Álbum: % siempre visible, breakdown solo a amigos */}
            <Card variant="elevated">
              <View className="flex-row items-center gap-4">
                <ProgressRing value={albumPct} size={56} />
                <View className="flex-1">
                  <Text className="text-text-tertiary text-xs font-sans-semibold uppercase tracking-wider">
                    Álbum
                  </Text>
                  <Text className="mt-1 text-2xl font-sans-bold text-text-primary">
                    {Math.round(albumPct * 100)}%
                  </Text>
                  {isFriend ? (
                    <Text className="text-xs text-text-secondary font-sans">
                      {stats?.have ?? 0} tiene · {stats?.repeated ?? 0} repetidos ·{' '}
                      {stats?.missing ?? 0} faltan
                    </Text>
                  ) : (
                    <Text className="text-xs text-text-tertiary font-sans">
                      Agrégalo como amigo para ver sus repetidos y faltantes.
                    </Text>
                  )}
                </View>
              </View>
            </Card>

            {/* Acciones */}
            {!isSelf && !blocked.data && (
              <View className="gap-2">
                <FriendButton targetUserId={id!} />
                <Button
                  label="Proponer intercambio"
                  variant={isFriend ? 'primary' : 'secondary'}
                  onPress={() =>
                    router.push({ pathname: '/(app)/match/[id]', params: { id } })
                  }
                />
                <Button
                  label="Bloquear"
                  variant="ghost"
                  onPress={() => blockSheet.current?.present(id!, profile.display_name)}
                />
              </View>
            )}

            {!isSelf && blocked.data && (
              <Card variant="outline">
                <Text className="text-sm font-sans-semibold text-text-primary">
                  Has bloqueado a este usuario
                </Text>
                <Text className="mt-1 text-xs text-text-tertiary font-sans">
                  No verá tu perfil ni podrá interactuar contigo.
                </Text>
                <View className="mt-3">
                  <Button
                    label="Desbloquear"
                    variant="secondary"
                    size="sm"
                    loading={unblock.isPending}
                    onPress={handleUnblock}
                  />
                </View>
              </Card>
            )}
          </>
        )}
      </ScrollView>

      <BlockSheet ref={blockSheet} onBlocked={() => router.back()} />
    </Screen>
  );
}
