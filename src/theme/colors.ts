/**
 * Design system color palette.
 * Source: /tmp/cromos-design/cromos-swap-app/project/app/components.jsx → C object
 */
export const C = {
  paper: '#F7F4ED', // warm cream
  paper2: '#EEEAE0', // slightly darker
  card: '#FFFFFF',
  ink: '#15140F',
  ink2: '#3A372F',
  muted: '#7A766B',
  faint: '#B8B3A6',
  hairline: '#E5E0D2',
  accent: '#1F5E3F', // pitch green
  accentSoft: '#E2EBE3',
  hot: '#C73E1D', // coral — perfect match / urgent
  hotSoft: '#F7E2DA',
  gold: '#B8862C',
  legend: '#1F1B14',
} as const;

export type CKey = keyof typeof C;

/**
 * Background radial gradient stops: #FCFAF4 → #F4EFE0 → #EAE4D2
 * Lighter, whiter cream — still warm but with more daylight to let
 * card outlines (especially missing/empty slots) read clearly.
 */
export const bgGradient = ['#FCFAF4', '#F4EFE0', '#EAE4D2'] as const;

/**
 * Rarity definitions — each with chip background, text color, and dot color.
 * Source: /tmp/cromos-design/cromos-swap-app/project/app/data.jsx → RARITIES
 */
export const RARITIES = {
  comun: {
    label: 'Común',
    bg: '#E8E5DE',
    text: '#3D3A33',
    dot: '#8B8678',
  },
  poco: {
    label: 'Poco común',
    bg: '#E0EBE3',
    text: '#2A4A36',
    dot: '#5B8C73',
  },
  raro: {
    label: 'Raro',
    bg: '#E4E9F2',
    text: '#27406D',
    dot: '#4A6BA6',
  },
  muyraro: {
    label: 'Muy raro',
    bg: '#EEE5F0',
    text: '#5A3168',
    dot: '#8E5BA0',
  },
  especial: {
    label: 'Especial',
    bg: '#F5E6D3',
    text: '#6B4513',
    dot: '#B8862C',
  },
  legendario: {
    label: 'Legendario',
    bg: '#1F1B14',
    text: '#FFD46B',
    dot: '#FFD46B',
  },
} as const;

export type RarityKey = keyof typeof RARITIES;
