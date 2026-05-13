import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '@/components/GradientBackground';
import Text from '@/components/Text';
import { useSession } from '@/lib/session-context';
import { C, spacing, radii } from '@/theme';

/**
 * Welcome screen — entry point for new users.
 *
 * Design faithful to /tmp/cromos-design/.../screens-onboarding.jsx WelcomeScreen:
 * - Decorative cromo-card stack (simulated with colored rectangles as placeholders)
 * - JetBrains Mono badge "◉ Mundial 2026 · Quito"
 * - Manrope 800 hero text with italic pitch-green accent
 * - Two CTAs: "Continuar con correo universitario" (primary, ink) | "Probar sin cuenta" (ghost)
 * - Disclaimer line at bottom
 *
 * ui-ux-pro-max rules applied:
 * - Touch targets ≥ 44pt (buttons are 54px tall)
 * - Loading feedback on guest sign-in
 * - No emoji icons
 * - Single primary CTA (ink); ghost secondary below
 * - Safe area aware via SafeAreaView
 */
export default function Welcome() {
  const router = useRouter();
  const { signInAsGuest } = useSession();
  const [guestLoading, setGuestLoading] = useState(false);

  const handleGuest = async () => {
    setGuestLoading(true);
    try {
      await signInAsGuest();
      // We're on /welcome, not /, so the index.tsx redirect doesn't fire.
      // Explicitly route to the album once the anon session is established.
      router.replace('/(tabs)/album');
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <GradientBackground />

      {/* ── Decorative cromo stack (placeholder rectangles) ── */}
      <View style={styles.stackArea} pointerEvents="none">
        {/* Left cromo, rotated -12deg */}
        <View style={[styles.cromoCard, styles.cromoLeft]} />
        {/* Right cromo, rotated +8deg */}
        <View style={[styles.cromoCard, styles.cromoRight]} />
        {/* Center cromo on top, slight -2deg */}
        <View style={[styles.cromoCard, styles.cromoCenter]} />
      </View>

      {/* ── Bottom content area ── */}
      <View style={styles.content}>
        {/* Monospace badge */}
        <Text style={styles.badge}>◉ Mundial 2026 · Quito</Text>

        {/* Hero heading */}
        <Text style={styles.heroLine1}>Completa el</Text>
        <Text style={styles.heroLine2}>álbum.</Text>
        <Text style={styles.heroAccent}>Sin pegamento.</Text>

        {/* Sub-copy */}
        <Text style={styles.body}>
          Encontrá repetidos, intercambiá con tu universidad y terminá el álbum del Mundial este año.
        </Text>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={() => router.push('/onboarding/email')}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Continuar con correo universitario"
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={styles.btnPrimaryText}>Continuar con correo universitario</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnGhost]}
            onPress={handleGuest}
            disabled={guestLoading}
            activeOpacity={0.72}
            accessibilityRole="button"
            accessibilityLabel="Probar sin cuenta, solo tracking personal"
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            {guestLoading ? (
              <ActivityIndicator size="small" color={C.muted} />
            ) : (
              <Text style={styles.btnGhostText}>Probar sin cuenta (solo tracking)</Text>
            )}
          </TouchableOpacity>

          {/* Returning user: same destination, different intent — Supabase's
              signInWithOtp handles both new signups and existing-user logins. */}
          <View style={styles.signinRow}>
            <Text style={styles.signinHint}>¿Ya tenés cuenta?</Text>
            <TouchableOpacity
              onPress={() => router.push('/onboarding/email')}
              activeOpacity={0.6}
              accessibilityRole="link"
              accessibilityLabel="Iniciar sesión con tu correo universitario"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.signinLink}>Iniciar sesión</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>Sin pagos · Sin publicidad · Solo entre universidades</Text>
      </View>
    </SafeAreaView>
  );
}

const CROMO_W = 90;
const CROMO_H = 126;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  stackArea: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cromoCard: {
    position: 'absolute',
    width: CROMO_W,
    height: CROMO_H,
    borderRadius: radii.lg,
    backgroundColor: C.card,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cromoLeft: {
    backgroundColor: '#E2EBE3',
    transform: [{ rotate: '-12deg' }, { translateX: -60 }, { translateY: 8 }],
  },
  cromoRight: {
    backgroundColor: '#F5E6D3',
    transform: [{ rotate: '8deg' }, { translateX: 58 }, { translateY: 18 }],
  },
  cromoCenter: {
    backgroundColor: C.card,
    transform: [{ rotate: '-2deg' }, { translateY: -10 }],
    zIndex: 2,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[8],
  },
  badge: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: C.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing[3],
  },
  heroLine1: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1.6,
    lineHeight: 44,
    color: C.ink,
  },
  heroLine2: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1.6,
    lineHeight: 44,
    color: C.ink,
  },
  heroAccent: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: -1.6,
    lineHeight: 48,
    color: C.accent,
    fontStyle: 'italic',
    marginBottom: spacing[4],
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: C.muted,
    maxWidth: 300,
    marginBottom: spacing[8],
  },
  actions: {
    gap: spacing[3],
  },
  btn: {
    height: 54,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
  },
  btnPrimary: {
    backgroundColor: C.ink,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  btnGhost: {
    backgroundColor: C.paper2,
    borderWidth: 0,
  },
  btnGhostText: {
    color: C.ink,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  signinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  signinHint: {
    fontSize: 13,
    color: C.muted,
  },
  signinLink: {
    fontSize: 13,
    fontWeight: '700',
    color: C.accent,
    letterSpacing: -0.1,
  },
  disclaimer: {
    marginTop: spacing[4],
    textAlign: 'center',
    fontSize: 11,
    color: C.faint,
    fontFamily: 'Manrope_400Regular',
  },
});
