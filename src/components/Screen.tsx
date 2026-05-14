import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from './GradientBackground';

interface ScreenProps {
  children: ReactNode;
}

/**
 * Root screen wrapper: SafeAreaView + radial gradient background.
 * All screens should use this as their outermost container.
 */
export default function Screen({ children }: ScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <GradientBackground />
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  content: {
    flex: 1,
  },
});
