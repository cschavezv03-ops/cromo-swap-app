import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';

// NativeWind v4 augments TextProps with className via nativewind-env.d.ts
// During typecheck without nativewind types active, we extend here.
interface ThemedTextProps extends TextProps {
  className?: string;
}

/**
 * Themed text component.
 * Defaults to Manrope font with ink color via NativeWind className.
 */
export default function Text({ className, ...props }: ThemedTextProps) {
  const RNTextAny = RNText as React.ComponentType<ThemedTextProps>;
  return <RNTextAny className={`font-manrope text-ink ${className ?? ''}`} {...props} />;
}
