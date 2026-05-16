// Design tokens. Mirror of CSS variables in `global.css`.
// Use these for code that can't use Tailwind classes (animations, SVG, Skia).
// Otherwise prefer Tailwind classes (e.g. `bg-bg`, `text-text-primary`).

export type Palette = {
  bg: string;
  surface: string;
  surfaceElev: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentSoft: string;
  success: string;
  warning: string;
  danger: string;
};

export const palette: Record<'light' | 'dark', Palette> = {
  light: {
    bg: '#FFFFFF',
    surface: '#F7F7F8',
    surfaceElev: '#FFFFFF',
    border: '#E5E5EA',
    borderStrong: '#D1D1D6',
    textPrimary: '#0B0B0E',
    textSecondary: '#6E6E76',
    textTertiary: '#A1A1A9',
    accent: '#4F46E5',
    accentSoft: '#EEF2FF',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
  },
  dark: {
    bg: '#0B0B0E',
    surface: '#16161B',
    surfaceElev: '#1E1E25',
    border: '#2A2A33',
    borderStrong: '#3A3A45',
    textPrimary: '#F7F7F8',
    textSecondary: '#A1A1A9',
    textTertiary: '#6E6E76',
    accent: '#818CF8',
    accentSoft: '#1E1B4B',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
  },
};

export const spacing = {
  px: 1,
  '0': 0,
  '0.5': 2,
  '1': 4,
  '1.5': 6,
  '2': 8,
  '2.5': 10,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '8': 32,
  '10': 40,
  '12': 48,
  '16': 64,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  black: '900',
} as const;

export type ThemeMode = 'light' | 'dark';
