import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
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
import { useFriendInventory } from '@/features/profile/hooks/useFriendInventory';
import type { FriendCromo } from '@/features/profile/data/friend-inventory';
import { useOtherProfile } from '@/features/profile/hooks/useOtherProfile';
import { track } from '@/lib/observability';
import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Button, Card, EmptyState, ProgressRing, Screen, Skeleton, useToast } from '@/ui';

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

  const repeated = useFriendInventory(id, 'repeated', isFriend);
  const missing = useFriendInventory(id, 'missing', isFriend);

  useEffect(() => {
    if (id && !isSelf) {
      track('profile_view', { is_friend: isFriend });
    }
  }, [id, isSelf, isFriend]);

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
                <Avatar
                  url={profile.avatar_url ?? null}
                  name={profile.display_name ?? ''}
                  size={64}
                />
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

            {/* Inventario visible solo a amigos */}
            {isFriend && (
              <>
                <FriendInventorySection
                  title="Sus repetidos disponibles"
                  emptyHint="No tiene repetidos disponibles para intercambiar."
                  data={repeated.data ?? []}
                  isLoading={repeated.isLoading}
                  variant="repeated"
                />
                <FriendInventorySection
                  title="Lo que le falta"
                  emptyHint="¡Ya completó el álbum!"
                  data={missing.data ?? []}
                  isLoading={missing.isLoading}
                  variant="missing"
                />
              </>
            )}

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

type FriendInventorySectionProps = {
  title: string;
  emptyHint: string;
  data: FriendCromo[];
  isLoading: boolean;
  variant: 'repeated' | 'missing';
};

function FriendInventorySection({
  title,
  emptyHint,
  data,
  isLoading,
  variant,
}: FriendInventorySectionProps) {
  const { colors } = useTheme();
  return (
    <View>
      <Text className="mb-2 px-1 text-[11px] font-sans-semibold uppercase tracking-[0.18em] text-text-tertiary">
        {title} {!isLoading && data.length > 0 && `(${data.length})`}
      </Text>
      {isLoading ? (
        <Skeleton width="100%" height={120} rounded="lg" />
      ) : data.length === 0 ? (
        <Text className="text-xs font-sans text-text-tertiary">{emptyHint}</Text>
      ) : (
        <View className="flex-row flex-wrap" style={{ marginHorizontal: -3 }}>
          {data.slice(0, 60).map((c) => (
            <View
              key={c.cromo_id}
              style={{
                width: '25%',
                padding: 3,
              }}
            >
              <View
                style={{
                  borderWidth: 1,
                  borderColor: variant === 'missing' ? colors.borderStrong : colors.border,
                  borderStyle: variant === 'missing' ? 'dashed' : 'solid',
                  borderRadius: 8,
                  padding: 6,
                  minHeight: 64,
                  backgroundColor: variant === 'missing' ? 'transparent' : colors.surfaceElev,
                }}
              >
                <Text
                  className="text-[10px] font-sans-semibold text-text-secondary"
                  numberOfLines={1}
                >
                  {c.printed_code}
                </Text>
                <Text
                  className="mt-0.5 text-[13px] font-mono text-text-primary"
                  numberOfLines={1}
                >
                  {c.jersey ?? '·'}
                </Text>
                <Text
                  className="mt-0.5 text-[9px] font-sans text-text-tertiary"
                  numberOfLines={1}
                >
                  {c.player_name ?? c.display_name}
                </Text>
                {variant === 'repeated' && c.owned_quantity >= 2 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      backgroundColor: colors.textPrimary,
                      paddingHorizontal: 5,
                      borderRadius: 999,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: '700',
                        color: colors.bg,
                      }}
                    >
                      x{c.owned_quantity}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
      {data.length > 60 && (
        <Text className="mt-2 text-[11px] font-sans text-text-tertiary">
          Mostrando los primeros 60 de {data.length}.
        </Text>
      )}
    </View>
  );
}
