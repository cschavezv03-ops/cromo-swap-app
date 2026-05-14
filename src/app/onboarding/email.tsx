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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '@/components/GradientBackground';
import Text from '@/components/Text';
import { useSession } from '@/lib/session-context';
import { requestEmailOtp, requestEmailChangeOtp } from '@/lib/auth';
import { C, spacing, radii } from '@/theme';

/**
 * Onboarding — institutional email entry.
 *
 * Design: plain cream bg, progress bar (step 1/4), Manrope 800 heading,
 * single email TextInput with helper text, "Enviar código" CTA.
 *
 * Upgrade path: when ?upgrade=1 is set (guest → registered), uses requestEmailChangeOtp.
 *
 * ui-ux-pro-max:
 * - Keyboard type: email-address
 * - Visible label above input
 * - Inline error below field, state cause + how to fix
 * - Loading state on CTA
 * - Touch targets ≥ 44pt
 * - No PII logged or shown in errors beyond what the server returns
 */
export default function OnboardingEmail() {
  const router = useRouter();
  const { upgrade } = useLocalSearchParams<{ upgrade?: string }>();
  const isUpgrade = upgrade === '1';
  const { isGuest } = useSession();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Client-side UX validation (not security) — basic email format check
  const isEmailLike = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const handleSubmit = async () => {
    setError('');
    const trimmed = email.trim().toLowerCase();

    if (!isEmailLike(trimmed)) {
      setError('Ingresá un correo válido, por ejemplo: nombre@epn.edu.ec');
      return;
    }

    setLoading(true);
    try {
      const fn = isUpgrade || isGuest ? requestEmailChangeOtp : requestEmailOtp;
      const { error: authError } = await fn(trimmed);

      if (authError) {
        // Surface the server message (no PII — server only returns domain-level errors)
        if (
          authError.message.toLowerCase().includes('university') ||
          authError.message.toLowerCase().includes('universitario') ||
          authError.message.toLowerCase().includes('permitido') ||
          authError.message.toLowerCase().includes('recognized') ||
          authError.message.toLowerCase().includes('domain')
        ) {
          setError('Usá tu correo institucional (@epn.edu.ec, @puce.edu.ec, @uce.edu.ec, …)');
        } else {
          setError('No pudimos enviar el código. Intentá de nuevo.');
        }
        return;
      }

      // Navigate to verify, passing the email via route params
      router.push({
        pathname: '/onboarding/verify',
        params: { email: trimmed, upgrade: isUpgrade ? '1' : '0' },
      });
    } finally {
      setLoading(false);
    }
  };

  const progress = 1 / 4; // step 1 of 4

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
            <Text style={styles.badge}>
              {isUpgrade ? '◉ Crear cuenta' : '◉ Tu correo'}
            </Text>

            {/* Heading */}
            <Text style={styles.heading}>
              {isUpgrade ? 'Convertí tu cuenta\nde invitado' : 'Tu correo\nuniversitario'}
            </Text>

            {/* Sub-copy — neutral for both first signup and returning login */}
            <Text style={styles.sub}>
              {isUpgrade
                ? 'Ingresá tu correo institucional para activar tu cuenta. Tu álbum y colección se preservan.'
                : 'Te enviamos un código a tu correo. Si ya tenés cuenta, iniciás sesión; si no, te creamos una con tu universidad.'}
            </Text>

            {/* Email field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Correo institucional</Text>
              <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(''); }}
                placeholder="nombre@universidad.edu.ec"
                placeholderTextColor={C.faint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                accessibilityLabel="Correo institucional"
                accessibilityHint="Ingresá tu correo universitario para recibir el código de verificación"
              />
              {/* Helper text */}
              {!error && (
                <Text style={styles.helper}>
                  Dominios aceptados: @epn.edu.ec, @puce.edu.ec, @uce.edu.ec, @usfq.edu.ec, ...
                </Text>
              )}
              {/* Inline error */}
              {!!error && (
                <Text style={styles.errorText} accessibilityRole="alert" accessibilityLiveRegion="polite">
                  {error}
                </Text>
              )}
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={[styles.btn, (!email.trim() || loading) && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={!email.trim() || loading}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Enviar código de verificación"
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.btnText}>Enviar código</Text>
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
    marginBottom: spacing[2],
  },
  sub: {
    fontSize: 14,
    lineHeight: 20,
    color: C.muted,
    marginBottom: spacing[6],
    maxWidth: 320,
  },
  fieldGroup: {
    marginBottom: spacing[6],
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
    fontSize: 16,
    color: C.ink,
    fontFamily: 'Manrope_400Regular',
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
