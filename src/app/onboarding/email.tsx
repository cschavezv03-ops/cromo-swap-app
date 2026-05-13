import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen, Text } from '@/components';
import { C, spacing } from '@/theme';

/**
 * Onboarding — institutional email entry.
 * Stub: pixel-perfect implementation is Phase 3 (Auth & Onboarding).
 */
export default function OnboardingEmail() {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Tu email universitario</Text>
        <Text style={styles.body}>
          Ingresá tu email institucional para verificar tu universidad. (Próximamente)
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: C.ink,
    marginBottom: spacing[3],
  },
  body: {
    fontSize: 15,
    color: C.muted,
  },
});
