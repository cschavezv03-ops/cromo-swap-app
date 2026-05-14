import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Text from './Text';
import { C, spacing, radii } from '@/theme';

interface RegisterPromptProps {
  /** Human-readable feature label, e.g. "intercambios" */
  feature: string;
}

/**
 * RegisterPrompt — shown in tabs that require a registered session.
 * Displayed when useSession().isGuest === true.
 *
 * Design: centered card on cream background, pitch-green CTA, JetBrains Mono badge.
 * UX: touch target >= 44px, clear label, accessible.
 */
export default function RegisterPrompt({ feature }: RegisterPromptProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push('/onboarding/email?upgrade=1');
  };

  return (
    <View style={styles.container} accessibilityRole="none">
      {/* Monospace badge */}
      <Text style={styles.badge}>◉ Solo registrados</Text>

      {/* Heading */}
      <Text style={styles.heading}>Registrate para{'\n'}usar {feature}</Text>

      {/* Body copy */}
      <Text style={styles.body}>
        Usá tu correo universitario para acceder a intercambios, el mercado y más.
      </Text>

      {/* CTA */}
      <TouchableOpacity
        style={styles.btn}
        onPress={handlePress}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel={`Crear cuenta para usar ${feature}`}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <Text style={styles.btnText}>Crear cuenta gratis</Text>
      </TouchableOpacity>

      {/* Disclaimer */}
      <Text style={styles.disclaimer}>
        Sin pagos · Sin publicidad · Solo entre universidades
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[3],
  },
  badge: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: C.accent,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing[1],
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: C.ink,
    textAlign: 'center',
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  body: {
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
  disclaimer: {
    marginTop: spacing[2],
    fontSize: 11,
    color: C.faint,
    textAlign: 'center',
    fontFamily: 'Manrope_400Regular',
  },
});
