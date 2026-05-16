/**
 * Utilidades para abrir conversaciones de WhatsApp desde la app.
 *
 * El formato esperado del teléfono es E.164 (ej. `+593987654321`). El
 * regex `^\+[1-9]\d{6,14}$` se aplica del lado del cliente al guardar y
 * también lo refuerza un CHECK constraint en `profile_contacts`.
 */

/** Regex E.164 que también valida `profile_contacts.whatsapp_phone`. */
export const WHATSAPP_PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

/**
 * Construye una URL `https://wa.me/<phone>?text=<msg>` lista para
 * `expo-linking.openURL(...)`. El parámetro `phone` debe venir en E.164.
 * El `+` inicial se quita porque wa.me no lo acepta.
 */
export function whatsappUrl(phone: string, message?: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
  const base = `https://wa.me/${digits}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

/** Valida un número en formato E.164 estricto. */
export function isValidE164(phone: string): boolean {
  return WHATSAPP_PHONE_REGEX.test(phone.trim());
}

/**
 * Normaliza una entrada cruda del usuario a E.164 asumiendo país por
 * defecto `+593` (Ecuador). Reglas:
 *  - Si ya empieza con `+`, devuelve tal cual (limpiando espacios).
 *  - Si empieza con `00`, lo reemplaza por `+`.
 *  - Si es solo dígitos, antepone `+593` y descarta un `0` líder.
 */
export function normalizeEcuadorPhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-().]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('00')) return `+${cleaned.slice(2)}`;
  const onlyDigits = cleaned.replace(/\D/g, '');
  const withoutLeadingZero = onlyDigits.replace(/^0+/, '');
  if (!withoutLeadingZero) return '';
  return `+593${withoutLeadingZero}`;
}
