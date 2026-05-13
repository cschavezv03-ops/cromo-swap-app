import React, { useState, useEffect, useRef } from 'react';
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
import { verifyEmailOtp, verifyEmailChangeOtp, requestEmailOtp, requestEmailChangeOtp } from '@/lib/auth';
import { C, spacing, radii } from '@/theme';

/**
 * Onboarding — 6-digit OTP verification.
 *
 * Design: progress bar (step 2/4), masked email display, OTP input,
 * "Verificar" CTA, "Reenviar código" with 30s cooldown.
 *
 * ui-ux-pro-max:
 * - Numeric keyboard for OTP (keyboardType="number-pad")
 * - Loading feedback on verify
 * - Inline error below OTP field
 * - Resend cooldown timer (UX feedback)
 * - Touch targets ≥ 44pt
 * - No PII in logs
 */
export default function OnboardingVerify() {
  const router = useRouter();
  const { email, upgrade } = useLocalSearchParams<{ email: string; upgrade?: string }>();
  const isUpgrade = upgrade === '1';

  const { refreshProfile } = useSession();

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Resend cooldown: 30 seconds
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(30);
    intervalRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const handleVerify = async () => {
    setError('');
    if (otp.trim().length !== 6) {
      setError('Ingresá el código de 6 dígitos que te enviamos.');
      return;
    }

    setLoading(true);
    try {
      const fn = isUpgrade ? verifyEmailChangeOtp : verifyEmailOtp;
      const { error: authError } = await fn(email, otp.trim());

      if (authError) {
        setError('Código incorrecto o expirado. Verificá el código o pedí uno nuevo.');
        return;
      }

      // Refresh profile — the handle_email_confirmed trigger may take a moment
      await refreshProfile();
      // The onboarding layout re-evaluates onboardingStep and routes to next step (university/whatsapp)
      router.replace('/onboarding');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    const fn = isUpgrade ? requestEmailChangeOtp : requestEmailOtp;
    await fn(email);
    startCooldown();
    setError('');
    setOtp('');
  };

  // Mask email for display: n***@domain.com
  const maskedEmail = email
    ? (() => {
        const [local, domain] = email.split('@');
        return `${local[0]}${'*'.repeat(Math.min(local.length - 1, 4))}@${domain}`;
      })()
    : '';

  const progress = 2 / 4;

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
            <Text style={styles.badge}>◉ Verificación</Text>

            {/* Heading */}
            <Text style={styles.heading}>Revisá tu{'\n'}correo</Text>

            {/* Sub-copy with masked email */}
            <Text style={styles.sub}>
              Te enviamos un código de 6 dígitos a{' '}
              <Text style={styles.subBold}>{maskedEmail}</Text>. Puede tardar unos segundos.
            </Text>

            {/* OTP field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Código de verificación</Text>
              <TextInput
                style={[styles.otpInput, error ? styles.inputError : null]}
                value={otp}
                onChangeText={(v) => {
                  // Only digits, max 6
                  const digits = v.replace(/\D/g, '').slice(0, 6);
                  setOtp(digits);
                  setError('');
                }}
                placeholder="000000"
                placeholderTextColor={C.faint}
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={handleVerify}
                accessibilityLabel="Código de 6 dígitos"
                accessibilityHint="Ingresá el código que te enviamos por correo"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
              />
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

            {/* Verify CTA */}
            <TouchableOpacity
              style={[styles.btn, (otp.length !== 6 || loading) && styles.btnDisabled]}
              onPress={handleVerify}
              disabled={otp.length !== 6 || loading}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Verificar código"
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.btnText}>Verificar</Text>
              )}
            </TouchableOpacity>

            {/* Resend */}
            <TouchableOpacity
              style={styles.resendBtn}
              onPress={handleResend}
              disabled={cooldown > 0}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={
                cooldown > 0 ? `Reenviar código en ${cooldown} segundos` : 'Reenviar código'
              }
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.resendText, cooldown > 0 && styles.resendDisabled]}>
                {cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar código'}
              </Text>
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
  subBold: {
    fontWeight: '700',
    color: C.ink2,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  fieldGroup: {
    marginBottom: spacing[5],
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: C.ink2,
    marginBottom: spacing[2],
    letterSpacing: -0.1,
  },
  otpInput: {
    height: 64,
    borderRadius: radii.lg,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
    paddingHorizontal: spacing[4],
    fontSize: 28,
    color: C.ink,
    fontFamily: 'JetBrainsMono_400Regular',
    letterSpacing: 8,
    textAlign: 'center',
  },
  inputError: {
    borderColor: '#C73E1D',
    borderWidth: 1.5,
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
    marginBottom: spacing[4],
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
  resendBtn: {
    alignItems: 'center',
    paddingVertical: spacing[3],
    minHeight: 44,
    justifyContent: 'center',
  },
  resendText: {
    fontSize: 14,
    color: C.accent,
    fontWeight: '600',
  },
  resendDisabled: {
    color: C.muted,
  },
});
