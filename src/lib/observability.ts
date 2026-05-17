/**
 * Capa fina de observabilidad: analítica y captura de errores.
 *
 * Backend actual: PostHog (analytics). Sentry queda como TODO para errores.
 *
 * Toda llamada a `track`/`identify`/`captureException` pasa por aquí; los
 * componentes NO importan posthog-react-native directamente. Esto permite:
 *   - Cambiar de proveedor sin tocar features
 *   - Centralizar sanitización de PII
 *   - Skip silencioso en dev / sin API key configurada
 */
import { posthog } from '@/config/posthog';

// PostHog tipa props como `Record<string, JsonType>` que excluye `unknown`.
// Aceptamos `any` en la API pública por simplicidad — internamente PostHog
// serializa con JSON.stringify y maneja valores no-JSON con seguridad.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = Record<string, any>;

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const observability = {
  sentryEnabled: Boolean(SENTRY_DSN),
};

/**
 * Reporta una excepción. En dev hace console.error; en prod, cuando esté
 * conectado, va a Sentry. Mientras tanto manda al `$exception` de PostHog.
 */
export function captureException(err: unknown, context?: Props): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error('[observability] captureException', err, context);
    return;
  }
  try {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack ?? '' : '';
    posthog.capture('$exception', {
      $exception_message: message,
      $exception_stack_trace_raw: stack,
      $exception_type: err instanceof Error ? err.constructor.name : 'unknown',
      ...(context ?? {}),
    });
  } catch {
    /* never crash on observability */
  }
}

/**
 * Tracking de un evento de producto. `name` debe ser snake_case y estable.
 * Ejemplos: `profile_complete`, `transaction_complete`, `listing_create`.
 *
 * Las props NO deben incluir datos sensibles (email, teléfono, etc.).
 */
export function track(name: string, props?: Props): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[analytics]', name, props ?? {});
  }
  try {
    posthog.capture(name, props ?? {});
  } catch {
    /* never crash */
  }
}

/**
 * Asocia un user_id al cliente.
 *   - `set` → traits que se sobreescriben en cada call (mergeables)
 *   - `setOnce` → traits que SOLO se asignan la primera vez (ej. signup_date)
 */
export function identify(
  userId: string,
  traits?: { set?: Props; setOnce?: Props },
): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[analytics] identify', userId, traits ?? {});
  }
  try {
    const payload: { $set?: Props; $set_once?: Props } = {};
    if (traits?.set) payload.$set = traits.set;
    if (traits?.setOnce) payload.$set_once = traits.setOnce;
    posthog.identify(
      userId,
      Object.keys(payload).length > 0 ? payload : undefined,
    );
  } catch {
    /* never crash */
  }
}

/** Cierra sesión del cliente de analytics (limpia distinct_id). */
export function resetAnalytics(): void {
  try {
    posthog.reset();
  } catch {
    /* never crash */
  }
}
