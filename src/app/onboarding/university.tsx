import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '@/components/GradientBackground';
import Text from '@/components/Text';
import { useSession } from '@/lib/session-context';
import { C, spacing, radii } from '@/theme';

/**
 * Onboarding — university confirmation (read-only beat).
 *
 * Shows the university derived server-side from the confirmed email.
 * "Tu universidad: EPN" with a color chip. User taps "Continuar" → /onboarding/whatsapp.
 *
 * If university is unexpectedly null, routes back to email with an error.
 *
 * Design: centered confirmation card with university color chip, "Continuar" CTA.
 */
export default function OnboardingUniversity() {
  const router = useRouter();
  const { profile } = useSession();

  const university = profile?.university ?? null;

  const handleContinue = () => {
    router.replace('/onboarding/whatsapp');
  };

  const handleBack = () => {
    router.replace('/onboarding/email');
  };

  const progress = 2.5 / 4;

  return (
    <SafeAreaView style={styles.root}>
      <GradientBackground />

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.content}>
        <Text style={styles.badge}>◉ Universidad verificada</Text>

        {university ? (
          <>
            <Text style={styles.heading}>¡Tu universidad{'\n'}fue confirmada!</Text>

            <Text style={styles.sub}>
              Tu correo verificó tu pertenencia a esta institución. Este dato es de solo lectura.
            </Text>

            {/* University chip */}
            <View style={styles.uniChip}>
              <View style={[styles.uniDot, { backgroundColor: C.accent }]} />
              <Text style={styles.uniLabel}>{university}</Text>
            </View>

            <TouchableOpacity
              style={styles.btn}
              onPress={handleContinue}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Continuar al siguiente paso"
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Text style={styles.btnText}>Continuar</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.heading}>No encontramos{'\n'}tu universidad</Text>
            <Text style={styles.sub}>
              Tu correo no está asociado a una universidad reconocida. Probá con otro correo institucional.
            </Text>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: C.ink }]}
              onPress={handleBack}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Volver a ingresar correo"
            >
              <Text style={styles.btnText}>Ingresar otro correo</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  progressTrack: {
    height: 4,
    backgroundColor: C.paper2,
    marginHorizontal: spacing[5],
    marginTop: spacing[5],
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.accent,
    borderRadius: radii.full,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
  },
  badge: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: C.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing[3],
  },
  heading: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 34,
    color: C.ink,
    marginBottom: spacing[2],
  },
  sub: {
    fontSize: 14,
    lineHeight: 20,
    color: C.muted,
    marginBottom: spacing[6],
    maxWidth: 320,
  },
  uniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: C.accentSoft,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radii.xl,
    alignSelf: 'flex-start',
    marginBottom: spacing[8],
  },
  uniDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  uniLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: C.accent,
    letterSpacing: 0.3,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  btn: {
    height: 54,
    borderRadius: radii.full,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});
