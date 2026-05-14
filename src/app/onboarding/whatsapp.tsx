import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '@/components/GradientBackground';
import Text from '@/components/Text';
import { useSession } from '@/lib/session-context';
import { setMyWhatsapp } from '@/lib/profile';
import { C, spacing, radii } from '@/theme';

/**
 * Onboarding — WhatsApp number capture.
 *
 * Design: progress bar (step 3/4), E.164 phone input, privacy copy,
 * "Continuar" CTA. Client validates format (UX only); the DB CHECK enforces it.
 *
 * Privacy note: number is only shared after the counterparty accepts a swap request (R3 spec §3.5).
 *
 * ui-ux-pro-max:
 * - Phone keyboard (keyboardType="phone-pad")
 * - Visible label above input
 * - +593 prefix hint for Ecuador
 * - Inline error near field
 * - Loading state on CTA
 * - Touch targets ≥ 44pt
 */

// E.164 regex — UX validation only (DB CHECK is the enforcement)
const E164_REGEX = /^\+[1-9]\d{6,14}$/;

export default function OnboardingWhatsapp() {
  const router = useRouter();
  const { refreshProfile, profile } = useSession();

  const [phone, setPhone] = useState('+593');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = E164_REGEX.test(phone.trim());

  const handleSubmit = async () => {
    setError('');
    if (!isValid) {
      setError('Ingresá el número en formato internacional, ej: +593987654321');
      return;
    }

    setLoading(true);
    try {
      const { error: dbError } = await setMyWhatsapp(phone.trim());
      if (dbError) {
        setError('No pudimos guardar el número. Verificá el formato e intentá de nuevo.');
        return;
      }
      await refreshProfile();
      // The onboarding layout re-evaluates onboardingStep → routes to scope
      router.replace('/onboarding');
    } finally {
      setLoading(false);
    }
  };

  const progress = 3 / 4;

  return (
    <SafeAreaView style={styles.root}>
      <GradientBackground />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>

          <View style={styles.content}>
            {/* Badge */}
            <Text style={styles.badge}>◉ Contacto</Text>

            {/* Heading */}
            <Text style={styles.heading}>Tu número{'\n'}de WhatsApp</Text>

            {/* University confirmation fold-in (if available) */}
            {profile?.university && (
              <View style={styles.uniBadge}>
                <View style={[styles.uniDot, { backgroundColor: C.accent }]} />
                <Text style={styles.uniLabel}>{profile.university}</Text>
              </View>
            )}

            {/* Sub-copy */}
            <Text style={styles.sub}>
              Este número solo se comparte con quien acepte tu solicitud de intercambio.
              No es visible de forma pública.
            </Text>

            {/* Phone field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Número en formato internacional</Text>
              <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                value={phone}
                onChangeText={(v) => {
                  // Always start with +
                  const clean = v.startsWith('+') ? v : '+' + v.replace(/^\+*/, '');
                  setPhone(clean);
                  setError('');
                }}
                placeholder="+593987654321"
                placeholderTextColor={C.faint}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                accessibilityLabel="Número de WhatsApp"
                accessibilityHint="Ingresá tu número incluyendo el código de país, por ejemplo más 593"
              />
              {!error && (
                <Text style={styles.helper}>
                  Formato E.164: +593 para Ecuador, +54 para Argentina, etc.
                </Text>
              )}
              {!!error && (
                <Text
                  style={styles.errorText}
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                >
                  {error}
                </Text>
              )}
            </View>

            {/* Privacy info box */}
            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>◉</Text>
              <Text style={styles.infoText}>
                Tu número no aparece en tu perfil público. Solo lo recibe quien vos aceptás para un intercambio.
              </Text>
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={[styles.btn, (!isValid || loading) && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={!isValid || loading}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Continuar"
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.btnText}>Continuar</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: spacing[12] },
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
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
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
    marginBottom: spacing[3],
  },
  uniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  uniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  uniLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.accent,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  sub: {
    fontSize: 14,
    lineHeight: 20,
    color: C.muted,
    marginBottom: spacing[6],
    maxWidth: 320,
  },
  fieldGroup: {
    marginBottom: spacing[4],
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: C.ink2,
    marginBottom: spacing[2],
    letterSpacing: -0.1,
  },
  input: {
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
    paddingHorizontal: spacing[4],
    fontSize: 18,
    color: C.ink,
    fontFamily: 'JetBrainsMono_400Regular',
    letterSpacing: 0.5,
  },
  inputError: {
    borderColor: '#C73E1D',
    borderWidth: 1.5,
  },
  helper: {
    marginTop: spacing[2],
    fontSize: 12,
    color: C.muted,
    lineHeight: 16,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  errorText: {
    marginTop: spacing[2],
    fontSize: 13,
    color: '#C73E1D',
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    gap: spacing[3],
    backgroundColor: C.accentSoft,
    borderRadius: radii.lg,
    padding: spacing[4],
    marginBottom: spacing[6],
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 14,
    color: C.accent,
    lineHeight: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: C.accent,
    fontWeight: '500',
  },
  btn: {
    height: 54,
    borderRadius: radii.full,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});
