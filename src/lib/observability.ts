/**
 * Capa fina de observabilidad: analítica y captura de errores.
 *
 * Sin dependencias hard a Sentry/PostHog. Cuando se decidan los paquetes
 * exactos (p. ej. `@sentry/react-native` + `posthog-react-native`), se
 * conectan dentro de los handlers de abajo siguiendo la interfaz pública
 * de este archivo (track / captureException). Mientras tanto, en dev
 * imprime al console para tracing local; en prod queda silencioso.
 */

type Props = Record<string, unknown>;

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;

export const observability = {
  sentryEnabled: Boolean(SENTRY_DSN),
  posthogEnabled: Boolean(POSTHOG_API_KEY),
};

/**
 * Reporta una excepción. En dev hace console.error; en prod, cuando esté
 * conectado, va a Sentry. Devuelve void para uso fire-and-forget.
 */
export function captureException(err: unknown, context?: Props): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error('[observability] captureException', err, context);
    return;
  }
  // TODO: when @sentry/react-native is wired:
  // Sentry.captureException(err, { contexts: { extra: context } });
}

/**
 * Tracking de un evento de producto. `name` debe ser snake_case y estable
 * (ej. 'profile_complete', 'transaction_complete', 'listing_create').
 */
export function track(name: string, props?: Props): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[analytics]', name, props ?? {});
    return;
  }
  // TODO: when posthog-react-native is wired:
  // posthog.capture(name, props);
}

/** Asocia un user_id al cliente de analítica. Llamar tras login exitoso. */
export function identify(userId: string, traits?: Props): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[analytics] identify', userId, traits ?? {});
    return;
  }
  // TODO: posthog.identify(userId, traits)
  // TODO: Sentry.setUser({ id: userId })
}
