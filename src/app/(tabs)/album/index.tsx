import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen, Text } from '@/components';
import { C, spacing } from '@/theme';

/**
 * Álbum tab — guest-accessible placeholder.
 * No data fetching, no social-graph calls.
 * Pixel-perfect implementation is Phase 4 (Album & Inventory).
 */
export default function AlbumScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Tu álbum</Text>
        <Text style={styles.body}>Tu colección WC 2026 aparecerá aquí. (Próximamente)</Text>
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
