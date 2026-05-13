import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen, Text } from '@/components';
import { C, spacing } from '@/theme';

/**
 * Perfil tab — placeholder.
 * No data fetching in Phase 1. Pixel-perfect is Phase 8 (Notifications & Profile).
 */
export default function PerfilScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Perfil</Text>
        <Text style={styles.body}>Tu perfil aparecerá aquí. (Próximamente)</Text>
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
    fontSize: 28,
    fontWeight: '800',
    color: C.ink,
    marginBottom: spacing[2],
  },
  body: {
    fontSize: 15,
    color: C.muted,
    textAlign: 'center',
  },
});
