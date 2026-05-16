import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { universitiesById } from '@/features/auth/lib/universities';
import { useMyBlocks, useUnblockUser } from '@/features/profile/hooks/useBlocks';
import { EmptyState, Screen, Skeleton, useToast } from '@/ui';
import { useTheme } from '@/theme/ThemeProvider';

export default function BlockedScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const blocks = useMyBlocks();
  const unblock = useUnblockUser();

  const handleUnblock = async (id: string, name: string) => {
    try {
      await unblock.mutateAsync(id);
      toast.show(`${name} desbloqueado.`, 'success');
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
          Bloqueados
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {blocks.isLoading && (
          <View className="px-5 gap-3 mt-3">
            <Skeleton width="100%" height={56} rounded="md" />
            <Skeleton width="100%" height={56} rounded="md" />
          </View>
        )}

        {!blocks.isLoading && (blocks.data ?? []).length === 0 && (
          <EmptyState
            title="No has bloqueado a nadie"
            description="Cuando bloquees a alguien desde su perfil, aparecerá en esta lista."
          />
        )}

        {(blocks.data ?? []).map((b, i, arr) => {
          const u = b.blocked?.university ? universitiesById[b.blocked.university] : null;
          const isLast = i === arr.length - 1;
          if (!b.blocked) return null;
          return (
            <View
              key={b.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.surface,
                }}
              >
                <Text className="text-base font-sans-bold text-text-primary">
                  {b.blocked.display_name?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-base font-sans-semibold text-text-primary">
                  {b.blocked.display_name}
                </Text>
                {u && (
                  <Text
                    className="text-xs font-sans-medium"
                    style={{ color: u.color }}
                  >
                    {u.short}
                  </Text>
                )}
              </View>
              <Pressable
                onPress={() => handleUnblock(b.blocked!.id, b.blocked!.display_name)}
                hitSlop={8}
              >
                <Text className="text-sm font-sans-semibold text-accent">Desbloquear</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
