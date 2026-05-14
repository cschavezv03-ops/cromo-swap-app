import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '@/components/GradientBackground';
import Text from '@/components/Text';
import { blockUser } from '@/lib/blocks';
import { C, spacing, radii } from '@/theme';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

/**
 * Other-user profile screen — Phase 3 minimal placeholder.
 *
 * Shows: display name, university.
 * Action: "Bloquear" (overflow action → Alert confirm → blockUser mutation).
 *
 * Rich profile content (avatar, inventory preview, trade history) is Phase 4+.
 *
 * ui-ux-pro-max: touch targets ≥ 44pt, destructive action confirm, safe area aware.
 */
export default function OtherUserProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data);
        setLoading(false);
      });
  }, [id]);

  const handleBlock = () => {
    const name = profile?.display_name ?? 'este usuario';
    Alert.alert(
      'Bloquear usuario',
      `¿Querés bloquear a ${name}? Ya no se verán entre sí en matches, mercado ni avisos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            setBlocking(true);
            try {
              await blockUser(id);
              Alert.alert('Bloqueado', `Bloqueaste a ${name}.`, [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } finally {
              setBlocking(false);
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
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : profile === null ? (
        <View style={styles.center}>
          <Text style={styles.notFoundText}>Usuario no encontrado.</Text>
        </View>
      ) : (
        <View style={styles.content}>
          {/* Profile info */}
          <Text style={styles.badge}>◉ Perfil</Text>
          <Text style={styles.displayName}>{profile.display_name}</Text>
          {profile.university && (
            <View style={styles.uniRow}>
              <View style={[styles.uniDot, { backgroundColor: C.accent }]} />
              <Text style={styles.uniLabel}>{profile.university}</Text>
            </View>
          )}

          {/* Phase 4+ placeholder */}
          <Text style={styles.placeholder}>
            Álbum e historial de intercambios disponibles próximamente (Fase 4+).
          </Text>

          {/* Block action — visually separated at bottom */}
          <View style={styles.destructiveZone}>
            <TouchableOpacity
              style={styles.blockBtn}
              onPress={handleBlock}
              disabled={blocking}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Bloquear a ${profile.display_name}`}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              {blocking ? (
                <ActivityIndicator size="small" color="#C73E1D" />
              ) : (
                <Text style={styles.blockText}>Bloquear usuario</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  backBtn: {
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  backText: {
    fontSize: 15,
    color: C.accent,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  notFoundText: {
    fontSize: 16,
    color: C.muted,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
  },
  badge: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: C.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
  },
  displayName: {
    fontSize: 28,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.5,
    marginBottom: spacing[2],
  },
  uniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  uniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  uniLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.accent,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  placeholder: {
    fontSize: 14,
    color: C.muted,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  destructiveZone: {
    marginTop: 'auto',
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
    borderTopWidth: 1,
    borderTopColor: C.hairline,
  },
  blockBtn: {
    height: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#C73E1D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockText: {
    fontSize: 15,
    color: '#C73E1D',
    fontWeight: '700',
  },
});
