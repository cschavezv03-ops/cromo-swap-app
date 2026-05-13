import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Text } from '@/components';
import { useSession } from '@/lib/session-context';
import { C, spacing, radii } from '@/theme';

/**
 * Perfil tab — Phase 3 implementation.
 *
 * Guest: minimal "estás como invitado" + "Crear cuenta" CTA.
 * Registered: display name, university (read-only), a "Usuarios bloqueados" link,
 * and "Cerrar sesión". Scope editing is Phase 4+ (link placeholder kept).
 *
 * ui-ux-pro-max: touch targets ≥ 44pt, destructive "Cerrar sesión" visually separated,
 * loading state on signOut.
 */
export default function PerfilScreen() {
  const router = useRouter();
  const { isGuest, profile, signOut } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  if (isGuest) {
    return (
      <Screen>
        <View style={styles.guestContainer}>
          <Text style={styles.guestBadge}>◉ Invitado</Text>
          <Text style={styles.guestHeading}>Estás usando{'\n'}la app sin cuenta</Text>
          <Text style={styles.guestBody}>
            Solo podés rastrear tu álbum personal. Creá una cuenta para intercambiar cromos con tu universidad.
          </Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => router.push('/onboarding/email?upgrade=1')}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Crear cuenta universitaria"
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={styles.btnText}>Crear cuenta universitaria</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que querés cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              await signOut();
            } finally {
              setSigningOut(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.profileHeader}>
          <Text style={styles.badge}>◉ Perfil</Text>
          <Text style={styles.displayName}>{profile?.display_name ?? 'Usuario'}</Text>
          {profile?.university && (
            <View style={styles.uniRow}>
              <View style={[styles.uniDot, { backgroundColor: C.accent }]} />
              <Text style={styles.uniLabel}>{profile.university}</Text>
              <Text style={styles.uniNote}>· verificado</Text>
            </View>
          )}
        </View>

        {/* Actions list */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Configuración</Text>

          {/* Scope (Phase 4+ edit; link to scope screen as edit) */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/onboarding/scope')}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Editar alcance de universidades"
          >
            <Text style={styles.rowLabel}>Alcance de universidades</Text>
            <Text style={styles.rowChevron}>›</Text>
          </TouchableOpacity>

          {/* Blocked users */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/(tabs)/perfil/blocked')}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Ver usuarios bloqueados"
          >
            <Text style={styles.rowLabel}>Usuarios bloqueados</Text>
            <Text style={styles.rowChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Destructive zone — visually separated */}
        <View style={styles.destructiveSection}>
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleSignOut}
            disabled={signingOut}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            {signingOut ? (
              <ActivityIndicator size="small" color="#C73E1D" />
            ) : (
              <Text style={styles.signOutText}>Cerrar sesión</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[3],
  },
  guestBadge: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: C.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  guestHeading: {
    fontSize: 26,
    fontWeight: '800',
    color: C.ink,
    textAlign: 'center',
    letterSpacing: -0.6,
    lineHeight: 30,
  },
  guestBody: {
    fontSize: 15,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  btn: {
    marginTop: spacing[2],
    height: 54,
    minWidth: 220,
    borderRadius: radii.full,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  scroll: {
    paddingBottom: spacing[12],
  },
  profileHeader: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[8],
    paddingBottom: spacing[6],
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
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
    fontSize: 26,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.5,
    marginBottom: spacing[2],
  },
  uniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
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
  uniNote: {
    fontSize: 13,
    color: C.muted,
  },
  section: {
    paddingTop: spacing[6],
    paddingHorizontal: spacing[5],
    gap: spacing[1],
  },
  sectionLabel: {
    fontSize: 11,
    color: C.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing[2],
    fontFamily: 'JetBrainsMono_400Regular',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    backgroundColor: C.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: C.hairline,
    minHeight: 52,
  },
  rowLabel: {
    fontSize: 15,
    color: C.ink,
    fontWeight: '500',
  },
  rowChevron: {
    fontSize: 20,
    color: C.muted,
    lineHeight: 24,
  },
  destructiveSection: {
    marginTop: spacing[12],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    borderTopWidth: 1,
    borderTopColor: C.hairline,
  },
  signOutBtn: {
    height: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#C73E1D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    fontSize: 15,
    color: '#C73E1D',
    fontWeight: '700',
  },
});
