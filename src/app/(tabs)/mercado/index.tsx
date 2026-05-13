import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen, Text } from '@/components';
import { useSession } from '@/lib/session-context';
import { C, spacing } from '@/theme';

/**
 * Mercado tab — requires registered session.
 * No data fetching in Phase 1. Pixel-perfect is Phase 6 (Direct Sales).
 */
export default function MercadoScreen() {
  const { isGuest } = useSession();

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Mercado</Text>
        {isGuest ? (
          <Text style={styles.body}>Registrate para ver ventas y subastas.</Text>
        ) : (
          <Text style={styles.body}>Las publicaciones del mercado aparecerán aquí. (Próximamente)</Text>
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
