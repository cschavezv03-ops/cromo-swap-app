import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '@/components/GradientBackground';
import Text from '@/components/Text';
import { listMyBlocks, unblockUser, type BlockWithProfile } from '@/lib/blocks';
import { C, spacing, radii } from '@/theme';

/**
 * Blocked users screen — shows list of users blocked by the current user.
 *
 * Design: list with display name + university, each with "Desbloquear" action,
 * plus an empty state when no blocks exist.
 *
 * ui-ux-pro-max:
 * - Touch targets ≥ 44pt
 * - Destructive confirm before unblock
 * - Empty state with guidance
 * - Loading state on list fetch
 */
export default function BlockedUsersScreen() {
  const router = useRouter();
  const [blocks, setBlocks] = useState<BlockWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await listMyBlocks();
    setBlocks(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUnblock = (block: BlockWithProfile) => {
    const name = block.profiles?.display_name ?? 'este usuario';
    Alert.alert(
      'Desbloquear',
      `¿Querés desbloquear a ${name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desbloquear',
          style: 'destructive',
          onPress: async () => {
            setUnblocking(block.blocked_id);
            try {
              await unblockUser(block.blocked_id);
              setBlocks((prev) => prev.filter((b) => b.blocked_id !== block.blocked_id));
            } finally {
              setUnblocking(null);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <GradientBackground />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Usuarios bloqueados</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : blocks.length === 0 ? (
        // Empty state
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>◉</Text>
          <Text style={styles.emptyHeading}>Sin bloqueos</Text>
          <Text style={styles.emptyBody}>
            No bloqueaste a ningún usuario. Si alguien te molesta, podés bloquearlo desde su perfil.
          </Text>
        </View>
      ) : (
        <FlatList
          data={blocks}
          keyExtractor={(item) => item.blocked_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.blockRow}>
              <View style={styles.blockInfo}>
                <Text style={styles.blockName}>
                  {item.profiles?.display_name ?? 'Usuario desconocido'}
                </Text>
                {item.profiles?.university && (
                  <Text style={styles.blockUni}>{item.profiles.university}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.unblockBtn}
                onPress={() => handleUnblock(item)}
                disabled={unblocking === item.blocked_id}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`Desbloquear ${item.profiles?.display_name ?? 'usuario'}`}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                {unblocking === item.blocked_id ? (
                  <ActivityIndicator size="small" color="#C73E1D" />
                ) : (
                  <Text style={styles.unblockText}>Desbloquear</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  backBtn: {
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 15,
    color: C.accent,
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[3],
  },
  emptyIcon: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 24,
    color: C.muted,
  },
  emptyHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: C.ink,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  list: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    backgroundColor: C.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: C.hairline,
    minHeight: 64,
  },
  blockInfo: {
    flex: 1,
    gap: spacing[1],
  },
  blockName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
  },
  blockUni: {
    fontSize: 12,
    color: C.muted,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  unblockBtn: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#C73E1D',
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unblockText: {
    fontSize: 13,
    color: '#C73E1D',
    fontWeight: '600',
  },
  separator: {
    height: spacing[2],
  },
});
