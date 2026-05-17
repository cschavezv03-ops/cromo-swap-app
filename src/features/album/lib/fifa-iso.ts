/**
 * Mapeo de los códigos FIFA de 3 letras (usados en el catálogo Panini
 * del Mundial 2026) a los códigos ISO 3166-1 alfa-2 que entiende la
 * librería `country-flag-icons`. Inglaterra y Escocia usan los códigos
 * subdivisionales GB-ENG / GB-SCT.
 */
export const FIFA_TO_ISO: Record<string, string> = {
  ALG: 'DZ',
  ARG: 'AR',
  AUS: 'AU',
  AUT: 'AT',
  BEL: 'BE',
  BIH: 'BA',
  BRA: 'BR',
  CAN: 'CA',
  CIV: 'CI',
  COD: 'CD',
  COL: 'CO',
  CPV: 'CV',
  CRO: 'HR',
  CUW: 'CW',
  CZE: 'CZ',
  ECU: 'EC',
  EGY: 'EG',
  ENG: 'GB-ENG',
  ESP: 'ES',
  FRA: 'FR',
  GER: 'DE',
  GHA: 'GH',
  HAI: 'HT',
  IRN: 'IR',
  IRQ: 'IQ',
  JOR: 'JO',
  JPN: 'JP',
  KOR: 'KR',
  KSA: 'SA',
  MAR: 'MA',
  MEX: 'MX',
  NED: 'NL',
  NOR: 'NO',
  NZL: 'NZ',
  PAN: 'PA',
  PAR: 'PY',
  POR: 'PT',
  QAT: 'QA',
  RSA: 'ZA',
  SCO: 'GB-SCT',
  SEN: 'SN',
  SUI: 'CH',
  SWE: 'SE',
  TUN: 'TN',
  TUR: 'TR',
  URU: 'UY',
  USA: 'US',
  UZB: 'UZ',
};

export function fifaToIso(code: string): string | null {
  return FIFA_TO_ISO[code] ?? null;
}
