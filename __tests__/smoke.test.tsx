/**
 * Smoke test — ensures the test runner works and basic components render.
 *
 * We import Text directly (not via the barrel that pulls in fonts/SVG)
 * to avoid loading expo-font/expo-asset in this unit smoke test.
 */

// Mock expo-font and related modules to avoid native module loading
jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true, null]),
  loadAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@expo-google-fonts/manrope', () => ({
  Manrope_400Regular: require('expo-font'),
  Manrope_500Medium: require('expo-font'),
  Manrope_600SemiBold: require('expo-font'),
  Manrope_700Bold: require('expo-font'),
  Manrope_800ExtraBold: require('expo-font'),
}));

jest.mock('@expo-google-fonts/jetbrains-mono', () => ({
  JetBrainsMono_400Regular: require('expo-font'),
}));

jest.mock('@expo-google-fonts/instrument-serif', () => ({
  InstrumentSerif_400Regular: require('expo-font'),
}));

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Svg: 'Svg',
  Defs: 'Defs',
  RadialGradient: 'RadialGradient',
  Stop: 'Stop',
  Rect: 'Rect',
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import Text from '../src/components/Text';

describe('Smoke test', () => {
  it('renders the themed Text component', () => {
    const { getByText } = render(<Text>hi</Text>);
    expect(getByText('hi')).toBeTruthy();
  });
});
