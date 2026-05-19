/**
 * Validación de contraseña — políticas razonables, no draconianas.
 *
 * Reglas:
 *   - Mínimo 8 caracteres
 *   - Al menos 1 letra (cualquier idioma)
 *   - Al menos 1 número
 *
 * NO requerimos símbolos especiales para no agregar fricción innecesaria
 * (NIST 800-63B recomienda contra rules complejas que llevan a passwords
 * predecibles como "Password1!"). Supabase Auth además bloquea passwords
 * filtradas en HaveIBeenPwned cuando el toggle está activo.
 */
export type PasswordIssue =
  | 'too_short'
  | 'missing_letter'
  | 'missing_number';

export type PasswordValidation = {
  ok: boolean;
  issues: PasswordIssue[];
  /** Lista legible en español, lista para mostrar en UI. */
  messages: string[];
};

const MIN_LENGTH = 8;

export function validatePassword(pwd: string): PasswordValidation {
  const issues: PasswordIssue[] = [];

  if (pwd.length < MIN_LENGTH) issues.push('too_short');
  if (!/\p{L}/u.test(pwd)) issues.push('missing_letter');
  if (!/\d/.test(pwd)) issues.push('missing_number');

  const messages = issues.map((i) => {
    switch (i) {
      case 'too_short':
        return `Al menos ${MIN_LENGTH} caracteres`;
      case 'missing_letter':
        return 'Al menos una letra';
      case 'missing_number':
        return 'Al menos un número';
    }
  });

  return { ok: issues.length === 0, issues, messages };
}

/** Devuelve "weak" | "ok" | "strong" según largo + diversidad. Solo para hint visual. */
export function passwordStrength(pwd: string): 'weak' | 'ok' | 'strong' {
  if (pwd.length < MIN_LENGTH) return 'weak';
  const hasLetter = /\p{L}/u.test(pwd);
  const hasNumber = /\d/.test(pwd);
  const hasSymbol = /[^\p{L}\d\s]/u.test(pwd);
  if (!hasLetter || !hasNumber) return 'weak';
  if (pwd.length >= 12 && hasSymbol) return 'strong';
  return 'ok';
}
