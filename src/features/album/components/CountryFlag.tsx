import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import {
  AR, AT, AU, BA, BE, BR, CA, CD, CH, CI, CO, CV, CZ,
  DE, DZ, EC, EG, ES, FR, GB_ENG, GB_SCT, GH, HR, HT,
  IQ, IR, JO, JP, KR, MA, MX, NL, NO, NZ, PA, PT, PY,
  QA, SA, SE, SN, TN, TR, US, UY, UZ, CW, ZA,
} from 'country-flag-icons/string/3x2';

import { fifaToIso } from '../lib/fifa-iso';

/**
 * Lookup ISO2 (o GB-XXX) → string SVG. Solo cargamos los 48 países del
 * Mundial 2026 para mantener el bundle ajustado.
 */
const FLAG_SVG: Record<string, string> = {
  AR, AT, AU, BA, BE, BR, CA, CD, CH, CI, CO, CV, CZ,
  DE, DZ, EC, EG, ES, FR, GH, HR, HT,
  IQ, IR, JO, JP, KR, MA, MX, NL, NO, NZ, PA, PT, PY,
  QA, SA, SE, SN, TN, TR, US, UY, UZ, CW, ZA,
  'GB-ENG': GB_ENG,
  'GB-SCT': GB_SCT,
};

type Size = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_DIMS: Record<Size, { w: number; h: number }> = {
  xs: { w: 16, h: 11 },
  sm: { w: 22, h: 15 },
  md: { w: 28, h: 19 },
  lg: { w: 36, h: 24 },
};

type Props = {
  /** Código FIFA de 3 letras (ej. ARG, BRA, GER). */
  code: string;
  size?: Size;
  /** Override del radius. Por default usa 3px. */
  radius?: number;
};

/**
 * Bandera real del país (SVG vectorial vía `country-flag-icons`).
 * Si el código FIFA no está en el mapeo, no renderiza nada.
 */
export function CountryFlag({ code, size = 'sm', radius = 3 }: Props) {
  const iso = fifaToIso(code);
  const svg = iso ? FLAG_SVG[iso] : null;
  const dims = SIZE_DIMS[size];

  if (!svg) return null;

  return (
    <View
      style={{
        width: dims.w,
        height: dims.h,
        borderRadius: radius,
        overflow: 'hidden',
      }}
    >
      <SvgXml xml={svg} width={dims.w} height={dims.h} />
    </View>
  );
}
