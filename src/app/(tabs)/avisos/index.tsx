import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen, Text } from '@/components';
import { useSession } from '@/lib/session-context';
import { C, spacing } from '@/theme';

/**
 * Avisos tab — requires registered session.
 * No data fetching in Phase 1. Pixel-perfect is Phase 8 (Notifications & Profile).
 */
export default function AvisosScreen() {
  const { isGuest } = useSession();

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Avisos</Text>
        {isGuest ? (
          <Text style={styles.body}>Registrate para recibir notificaciones.</Text>
        ) : (
          <Text style={styles.body}>Tus notificaciones aparecerán aquí. (Próximamente)</Text>
        )}
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
