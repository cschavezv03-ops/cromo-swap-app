import { Text, View } from 'react-native';

import { FlagDot } from '@/ui';

import { fifaToIso } from '../lib/fifa-iso';
import { isSpecialSection } from '../lib/sections';
import type { CountryMeta } from '../lib/types';

import { CountryFlag } from './CountryFlag';

type Size = 'sm' | 'md';

type Props = {
  country: CountryMeta;
  size?: Size;
};

/**
 * Marca visual de una sección del álbum.
 *  - Países: bandera real (SVG) vía `country-flag-icons`. Si no hay
 *    mapeo FIFA→ISO (p.ej. selección no registrada), cae al `FlagDot`
 *    de stripe + código.
 *  - Secciones especiales (FWC / MUSEUM / COCA / EXTRA): pill neutra
 *    con el nombre corto sobre el color de marca. Sin logos, sin
 *    glyphs — limpio y sin riesgo de IP.
 */
export function SectionMark({ country, size = 'md' }: Props) {
  if (!isSpecialSection(country.code)) {
    const hasRealFlag = fifaToIso(country.code) !== null;
    if (hasRealFlag) {
      return <CountryFlag code={country.code} size={size === 'sm' ? 'sm' : 'md'} />;
    }
    return (
      <FlagDot
        code={country.code}
        color={country.stripe}
        accentColor={country.accent}
        size={size}
      />
    );
  }

  if (country.code === 'EXTRA') return null;
  return <SpecialPill code={country.code} size={size} stripe={country.stripe} accent={country.accent} />;
}

const SHORT_LABEL: Record<string, string> = {
  FWC: 'INTRO',
  MUSEUM: 'MUSEUM',
  COCA: 'COCA-COLA',
};

const PILL_HEIGHT: Record<Size, number> = {
  sm: 18,
  md: 22,
};

function SpecialPill({
  code,
  size,
  stripe,
  accent,
}: {
  code: string;
  size: Size;
  stripe: string;
  accent: string;
}) {
  const label = SHORT_LABEL[code] ?? code;
  return (
    <View
      style={{
        height: PILL_HEIGHT[size],
        paddingHorizontal: size === 'sm' ? 7 : 9,
        borderRadius: PILL_HEIGHT[size] / 2,
        backgroundColor: stripe,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: size === 'sm' ? 9 : 10,
          fontWeight: '800',
          color: accent,
          letterSpacing: 0.6,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
