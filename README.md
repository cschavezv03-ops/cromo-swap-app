# Cromos Swap App

App gratuita para encontrar personas cercanas en universidades de Quito con quienes intercambiar, comprar o subastar cromos físicos del Mundial 2026.

## Stack

- **Expo SDK 54** (managed) — React 19 + RN 0.81 + New Architecture default
- **Expo Router v6** — file-based routing, typed routes
- **TypeScript** estricto (`noUncheckedIndexedAccess`, `noImplicitOverride`)
- **NativeWind 4.1 + Tailwind 3.4** — styling
- **Supabase** — Postgres + Auth (OTP institucional + anónimos) + RLS deny-by-default
- **TanStack Query v5** — server state + AsyncStorage persister
- **Zustand v5** — UI state
- **React Hook Form + Zod 3** — forms
- **Reanimated 4 + Gesture Handler 2** — animaciones / gestos
- **@gorhom/bottom-sheet 5** — sheets nativos (cromo detail)
- **@shopify/flash-list** — listas virtualizadas

## Arquitectura — feature-first

```
app/                          # Solo rutas (Expo Router)
  _layout.tsx                 # Providers globales + splash gate
  index.tsx                   # Gate auth/onboarding/tabs
  welcome.tsx
  onboarding/                 # email → verify → university → whatsapp → scope
  (tabs)/                     # Álbum · Matches · Mercado · Avisos · Perfil

src/
  features/                   # cada feature autocontenida
    session/                  # SessionProvider + queries
    auth/                     # OTP signIn/verify
    onboarding/               # universities, scope, whatsapp mutations
    album/                    # tracking funcional end-to-end
      data/                   # queries + mutations (optimistic)
      lib/                    # helpers puros (merge, filter, group)
      components/             # CromoCard, CromoSheet, etc.
      screens/                # AlbumScreen
  shared/
    ui/                       # primitives (Screen, Text, Button, Pill, Card, Input)
    theme/                    # design tokens
    lib/                      # supabase, query-client, secure-store, cn, env
    types/database.ts         # generado desde MCP

supabase/                     # 33 migraciones (FUENTE DE VERDAD)
```

## Setup

1. Crear `.env` (o usar los fallbacks ya cableados en `app.config.ts`):

   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://wpcnqfyfcnebtmxstcpo.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   ```

   Las publishable keys de Supabase están diseñadas para embed público (como `pk_*` de Stripe).
   El service-role key NUNCA debe estar en el bundle del cliente.

2. Instalar dependencias:

   ```bash
   npm install
   ```

3. Correr en Android:

   ```bash
   npx expo start --android
   # o con dev client:
   npx expo run:android
   ```

4. Regenerar tipos de DB tras cualquier migración nueva:

   ```bash
   # Vía Supabase MCP en Claude Code:
   #   mcp__supabase__generate_typescript_types → src/shared/types/database.ts
   ```

## Auth dashboard

Ver `supabase/AUTH_SETUP.md`. Hito por hito:

- Confirm email ON
- Anonymous sign-ins ON
- Manual linking ON (necesario para upgrade guest → registrado preservando inventario)
- Before-user-created hook wired a `public.before_user_created_hook` (bloquea dominios no institucionales)
- Plantillas con `{{ .Token }}` (NO `{{ .ConfirmationURL }}` — la app espera código, no link)
- Redirect URL: `cromos://`

## Modelo conceptual

- **Guest** (anonymous): puede trackear su álbum localmente con anclaje en Postgres (`profiles.is_anonymous = true`).
  No ve perfiles, no hace matches, no compra, no subasta. Su user_id se preserva si hace upgrade.
- **Registered**: completa universidad + WhatsApp + scope.
  Aparece en búsquedas, matches y mercado.
- **Una unidad de cromo solo puede estar en UN canal activo a la vez** (intercambio | venta | subasta).
- **WhatsApp se revela SOLO después de aceptación** (intercambio, compra o subasta ganada).
- **Subastas**: si el ganador no concreta → bloqueo de subastas por 2 semanas.
- **Precios solo en USD**. Sin pagos en la app. Sin publicidad. Sin premium.

## Lógica de inventario

Cada `inventory_items` tiene tres cantidades:
- `owned_quantity` — total que tiene en mano
- `pasted_quantity` — cuántos ya pegó en el álbum (subset de owned)
- `wanted_quantity` — wishlist explícito (faltantes específicos)

Estado derivado en la app:
- `isMissing = owned === 0`
- `isOwned = owned >= 1`
- `isRepeated = owned > 1`

El usuario decide cuántos repetidos ofrece — tener repetidos NO implica disponibilidad.

## Convenciones de código

- **Feature-first**. Cada feature en `src/features/<name>/{data,lib,components,screens}`.
- **Sin lógica en routes** — los archivos en `app/` solo importan screens del feature.
- **Mutaciones en DB siempre vía RPC** cuando existe (`fn_*` en `supabase/migrations/`).
  Las constraints multi-tabla (reserva, status machine) NO se aplican solo con RLS.
- **Optimistic updates**: ver `src/features/album/data/mutations.ts` (`useSetInventory`).
- **Sin `any`, sin `// @ts-ignore`** sin justificación inline.
- **No comentar el QUÉ**. Solo comentar PORQUÉ cuando hay un constraint oculto o un workaround.

## Migraciones

33 aplicadas en remoto. Ver `supabase/README.md` para detalle de cada una.
La DB es la fuente de verdad — nunca SQL ad-hoc, todo va por migración nueva.
