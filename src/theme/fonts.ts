import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';

/**
 * Font family name constants — use these in style sheets.
 */
export const FONTS = {
  manrope: 'Manrope_400Regular',
  manropeMedium: 'Manrope_500Medium',
  manropeSemiBold: 'Manrope_600SemiBold',
  manropeBold: 'Manrope_700Bold',
  manropeExtraBold: 'Manrope_800ExtraBold',
  mono: 'JetBrainsMono_400Regular',
  serif: 'InstrumentSerif_400Regular',
} as const;

/**
 * Font map for expo-font useFonts().
 */
export const fontMap = {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  JetBrainsMono_400Regular,
  InstrumentSerif_400Regular,
} as const;
