/**
 * Cromo card size presets.
 * Source: /tmp/cromos-design/cromos-swap-app/project/app/components.jsx → CromoCard dims
 */
export const cromoDims = {
  xs: { width: 56, height: 78, num: 9, flag: 14, name: 0 },
  sm: { width: 72, height: 100, num: 10, flag: 18, name: 8 },
  md: { width: 92, height: 128, num: 11, flag: 22, name: 9 },
  lg: { width: 140, height: 196, num: 14, flag: 32, name: 11 },
  xl: { width: 200, height: 280, num: 18, flag: 48, name: 14 },
} as const;

export type CromoDimKey = keyof typeof cromoDims;
export type CromoDim = (typeof cromoDims)[CromoDimKey];

// Re-export colors for convenience
export { C, bgGradient, RARITIES } from './colors';
export type { CKey, RarityKey } from './colors';
export { spacing } from './spacing';
export type { SpacingKey } from './spacing';
export { radii } from './radii';
export type { RadiiKey } from './radii';
export { FONTS, fontMap } from './fonts';
