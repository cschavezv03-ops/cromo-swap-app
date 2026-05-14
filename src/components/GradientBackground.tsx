import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { bgGradient } from '@/theme';

/**
 * Radial gradient background using react-native-svg.
 * Gradient stops: #FEFDF7 → #FAF6EA → #F2EDDB (see `bgGradient` in theme/colors).
 * Absolute fill — render behind content.
 */
export default function GradientBackground() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="bg-radial" cx="50%" cy="40%" r="70%" fx="50%" fy="40%">
            <Stop offset="0%" stopColor={bgGradient[0]} />
            <Stop offset="50%" stopColor={bgGradient[1]} />
            <Stop offset="100%" stopColor={bgGradient[2]} />
          </RadialGradient>
        </Defs>
        <Rect width="1" height="1" fill="url(#bg-radial)" />
      </Svg>
    </View>
  );
}
