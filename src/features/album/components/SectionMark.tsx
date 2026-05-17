import { Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { FlagDot } from '@/ui';

import { isSpecialSection } from '../lib/sections';
import type { CountryMeta } from '../lib/types';

type Size = 'sm' | 'md';

type Props = {
  country: CountryMeta;
  size?: Size;
};

/**
 * Marca visual de una sección del álbum. Para países renderiza la banda
 * de colores (FlagDot). Para secciones especiales (FWC / MUSEUM / COCA /
 * EXTRA) usa un sello SVG monocromático/contenido para mantener el look
 * minimalista en lugar de un emoji vibecodeado.
 */
export function SectionMark({ country, size = 'md' }: Props) {
  const code = country.code;

  if (!isSpecialSection(code)) {
    return (
      <FlagDot
        code={code}
        color={country.stripe}
        accentColor={country.accent}
        size={size}
      />
    );
  }

  // EXTRA: sin sello, solo el título.
  if (code === 'EXTRA') return null;

  return (
    <SpecialBadge code={code} size={size} stripe={country.stripe} accent={country.accent} />
  );
}

type BadgeProps = {
  code: 'FWC' | 'MUSEUM' | 'COCA' | string;
  size: Size;
  stripe: string;
  accent: string;
};

const BADGE_DIMS: Record<Size, { w: number; h: number }> = {
  sm: { w: 28, h: 20 },
  md: { w: 32, h: 24 },
};

function SpecialBadge({ code, size, stripe, accent }: BadgeProps) {
  const dims = BADGE_DIMS[size];
  return (
    <View
      style={{
        width: dims.w,
        height: dims.h,
        borderRadius: 6,
        backgroundColor: stripe,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {code === 'FWC' && <SoccerBallMark color={accent} size={dims.h - 6} />}
      {code === 'MUSEUM' && <ColumnsMark color={accent} size={dims.h - 6} />}
      {code === 'COCA' && <BottleMark color={accent} size={dims.h - 6} />}
      {code !== 'FWC' && code !== 'MUSEUM' && code !== 'COCA' && (
        <Text
          style={{
            fontSize: size === 'sm' ? 9 : 10,
            fontWeight: '800',
            color: accent,
            letterSpacing: 0.4,
          }}
        >
          {code.slice(0, 3)}
        </Text>
      )}
    </View>
  );
}

function SoccerBallMark({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={8.5} fill="none" stroke={color} strokeWidth={1.6} />
      <Path
        d="M12 4l3 5-3 3-3-3 3-5z M12 12l5 1.5L15 19h-6l-2-5.5L12 12z"
        fill={color}
      />
    </Svg>
  );
}

function ColumnsMark({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size + 4} height={size} viewBox="0 0 28 24">
      <Path d="M3 6h22 M5 8v10 M11 8v10 M17 8v10 M23 8v10 M3 19h22" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M2 6l12-3 12 3" fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}

function BottleMark({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size - 4} height={size} viewBox="0 0 16 24">
      <Path
        d="M6 2h4v3l1.5 2v3l-1 1.5v9.5a2 2 0 0 1-2 2H7.5a2 2 0 0 1-2-2v-9.5l-1-1.5V7L6 5V2z"
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Rect x={5.5} y={13.5} width={5} height={1} fill={color} />
    </Svg>
  );
}
