import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Text } from '@/components';
import { useSession } from '@/lib/session-context';
import { C, spacing, radii } from '@/theme';

/**
 * Welcome screen — entry point for new users.
 * Placeholder stub; pixel-perfect design is Phase 4+ (ui-ux-pro-max skill).
 */
export default function Welcome() {
  const router = useRouter();
  const { signInAsGuest } = useSession();

  const handleSignInAsGuest = async () => {
    await signInAsGuest();
    router.replace('/(tabs)/album');
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Cromos</Text>
        <Text style={styles.subtitle}>Álbum WC 2026</Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={() => router.push('/onboarding/email')}
          >
            <Text style={styles.btnPrimaryText}>Crear cuenta</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={handleSignInAsGuest}>
            <Text style={styles.btnSecondaryText}>Entrar como invitado</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.6,
    marginBottom: spacing[1],
  },
  subtitle: {
    fontSize: 16,
    color: C.muted,
    marginBottom: spacing[12],
  },
  actions: {
    width: '100%',
    gap: spacing[3],
  },
  btn: {
    height: 54,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: C.ink,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  btnSecondary: {
    backgroundColor: C.paper2,
  },
  btnSecondaryText: {
    color: C.ink,
    fontSize: 15,
    fontWeight: '700',
  },
});
