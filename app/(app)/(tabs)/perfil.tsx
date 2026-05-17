import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { UniversityBadge } from '@/features/auth/components/UniversityBadge';
import { useSignOut } from '@/features/auth/hooks/useAuthMutations';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { useSession } from '@/features/auth/hooks/useSession';
import { universitiesById } from '@/features/auth/lib/universities';
import { useMyFriends, usePendingIn } from '@/features/friends/hooks/useFriends';
import { useMyListings } from '@/features/marketplace/hooks/useListings';
import { useMyBlocks } from '@/features/profile/hooks/useBlocks';
import { useMyWhatsApp } from '@/features/profile/hooks/useWhatsApp';
import {
  WhatsAppPrompt,
  type WhatsAppPromptHandle,
} from '@/features/profile/components/WhatsAppPrompt';
import { useUnreadNotificationsCount } from '@/features/notifications/hooks/useNotifications';
import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Button, Card, Chip, ProgressRing, Screen, ScreenHeader, ThemePicker, useToast } from '@/ui';

export default function PerfilTab() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const { user } = useSession();
  const { data: profile } = useProfile();
  const blocks = useMyBlocks();
  const whatsapp = useMyWhatsApp();
  const myListings = useMyListings();
  const friends = useMyFriends();
  const pendingIn = usePendingIn();
  const unreadCount = useUnreadNotificationsCount();
  const signOut = useSignOut();

  const uni = profile?.university ? universitiesById[profile.university] : null;
  const albumPct = (profile?.album_pct ?? 0) / 100;
  const blocksCount = blocks.data?.length ?? 0;
  const friendsCount = friends.data?.length ?? 0;
  const pendingInCount = pendingIn.data?.length ?? 0;
  const myListingsCount = (myListings.data ?? []).filter(
    (l) => l.status === 'active' || l.status === 'reserved',
  ).length;
  const whatsappPrompt = useRef<WhatsAppPromptHandle>(null);

  const handleSignOut = async () => {
    try {
      await signOut.mutateAsync();
      router.replace('/(auth)/welcome');
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'No se pudo cerrar sesión.', 'danger');
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Perfil" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 16 }}>
        <Card variant="elevated">
          <View className="flex-row items-center gap-4">
            <Avatar
              url={profile?.avatar_url ?? null}
              name={profile?.display_name ?? ''}
              size={64}
            />
            <View className="flex-1">
              <Text className="text-xl font-sans-bold text-text-primary">
                {profile?.display_name ?? '—'}
              </Text>
              <Text className="text-sm text-text-tertiary font-sans">{user?.email}</Text>
              <View className="mt-2">
                <UniversityBadge university={uni ?? null} size="sm" />
              </View>
            </View>
          </View>
          <View className="mt-4">
            <Button
              label="Editar perfil"
              variant="secondary"
              size="sm"
              onPress={() => router.push('/(app)/profile/edit')}
            />
          </View>
        </Card>

        <Card variant="elevated">
          <View className="flex-row items-center gap-4">
            <ProgressRing value={albumPct} size={56} />
            <View className="flex-1">
              <Text className="text-text-tertiary text-xs font-sans-semibold uppercase tracking-wider">
                Tu álbum
              </Text>
              <Text className="mt-1 text-2xl font-sans-bold text-text-primary">
                {profile?.album_pct ?? 0}%
              </Text>
              <Text className="text-sm text-text-secondary font-sans">
                El conteo total se calcula en segundo plano.
              </Text>
            </View>
          </View>
        </Card>

        <Card variant="elevated">
          <Text className="text-text-tertiary text-xs font-sans-semibold uppercase tracking-wider">
            Tu scope
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {(profile?.scope ?? []).map((id) => {
              const u = universitiesById[id];
              if (!u) return null;
              return (
                <Chip
                  key={id}
                  label={u.short}
                  variant="outline"
                  leftSlot={
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: u.color,
                      }}
                    />
                  }
                />
              );
            })}
            {(!profile?.scope || profile.scope.length === 0) && (
              <Text className="text-text-tertiary text-sm font-sans">
                No tienes universidades seleccionadas. Edita tu perfil para configurarlas.
              </Text>
            )}
          </View>
        </Card>

        <Card variant="elevated">
          <Text className="text-text-tertiary text-xs font-sans-semibold uppercase tracking-wider">
            Cuenta
          </Text>
          <View className="mt-2">
            <SettingsRow
              label="WhatsApp"
              hint={whatsapp.data?.whatsapp_phone ?? 'No configurado'}
              hintTone={whatsapp.data?.whatsapp_phone ? 'normal' : 'warning'}
              onPress={() => whatsappPrompt.current?.present()}
              borderColor={colors.border}
            />
            <SettingsRow
              label="Buscar personas"
              hint="Por nombre o universidad"
              onPress={() => router.push('/(app)/search')}
              borderColor={colors.border}
            />
            <SettingsRow
              label="Amigos"
              hint={
                pendingInCount > 0
                  ? `${friendsCount} · ${pendingInCount} solicitud${pendingInCount === 1 ? '' : 'es'}`
                  : friendsCount === 0
                    ? 'Sin amigos'
                    : `${friendsCount} amigo${friendsCount === 1 ? '' : 's'}`
              }
              hintTone={pendingInCount > 0 ? 'accent' : 'normal'}
              onPress={() => router.push('/(app)/friends')}
              borderColor={colors.border}
            />
            <SettingsRow
              label="Mis publicaciones"
              hint={
                myListingsCount === 0
                  ? 'Sin publicaciones activas'
                  : `${myListingsCount} activa${myListingsCount === 1 ? '' : 's'}`
              }
              onPress={() => router.push('/(app)/listings/mine')}
              borderColor={colors.border}
            />
            <SettingsRow
              label="Bloqueados"
              hint={blocksCount === 0 ? 'Ninguno' : `${blocksCount} usuario${blocksCount === 1 ? '' : 's'}`}
              onPress={() => router.push('/(app)/profile/blocked')}
              borderColor={colors.border}
            />
            <SettingsRow
              label="Avisos sin leer"
              hint={unreadCount === 0 ? '0' : `${unreadCount}`}
              hintTone={unreadCount > 0 ? 'accent' : 'normal'}
              onPress={() => router.push('/(app)/(tabs)/avisos')}
              borderColor={colors.border}
            />
            <SettingsRow
              label="Histórico de intercambios"
              hint="Ver completados y cancelados"
              onPress={() => router.push('/(app)/transactions/history')}
              borderColor={colors.border}
            />
            <SettingsRow
              label="Acerca de la app"
              hint="Versión, términos, soporte"
              onPress={() => router.push('/(app)/about')}
              borderColor={colors.border}
              isLast
            />
          </View>
        </Card>

        <Card variant="elevated">
          <ThemePicker />
        </Card>

        <Button
          label="Cerrar sesión"
          variant="secondary"
          loading={signOut.isPending}
          onPress={handleSignOut}
        />
      </ScrollView>

      <WhatsAppPrompt ref={whatsappPrompt} />
    </Screen>
  );
}

function SettingsRow({
  label,
  hint,
  hintTone = 'normal',
  onPress,
  borderColor,
  isLast = false,
}: {
  label: string;
  hint: string;
  hintTone?: 'normal' | 'warning' | 'accent';
  onPress: () => void;
  borderColor: string;
  isLast?: boolean;
}) {
  const hintClass =
    hintTone === 'warning'
      ? 'text-warning'
      : hintTone === 'accent'
        ? 'text-accent'
        : 'text-text-tertiary';
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: borderColor,
      }}
    >
      <Text className="flex-1 text-[15px] font-sans-medium text-text-primary">{label}</Text>
      <Text className={`text-sm font-sans-medium ${hintClass}`}>{hint}</Text>
      <Text className="ml-2 text-text-tertiary text-sm">›</Text>
    </Pressable>
  );
}
