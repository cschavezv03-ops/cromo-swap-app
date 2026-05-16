import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { UniversityBadge } from '@/features/auth/components/UniversityBadge';
import { useSignOut } from '@/features/auth/hooks/useAuthMutations';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { useSession } from '@/features/auth/hooks/useSession';
import { universitiesById } from '@/features/auth/lib/universities';
import { Button, Card, Chip, ProgressRing, Screen, ScreenHeader, ThemePicker, useToast } from '@/ui';

export default function PerfilTab() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useSession();
  const { data: profile } = useProfile();
  const signOut = useSignOut();

  const uni = profile?.university ? universitiesById[profile.university] : null;
  const albumPct = (profile?.album_pct ?? 0) / 100;

  const handleSignOut = async () => {
    try {
      await signOut.mutateAsync();
      router.replace('/(auth)/email');
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
            <View className="h-16 w-16 items-center justify-center rounded-pill bg-surface">
              <Text className="text-2xl font-sans-bold text-text-primary">
                {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
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
          <ThemePicker />
        </Card>

        <Button
          label="Cerrar sesión"
          variant="secondary"
          loading={signOut.isPending}
          onPress={handleSignOut}
        />
      </ScrollView>
    </Screen>
  );
}
