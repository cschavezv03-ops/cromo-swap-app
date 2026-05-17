# Cromo Swap — Prod Readiness Report

Fecha: 2026-05-17
Branch: `main`

---

## TL;DR

La app **NO está lista para prod** todavía, pero está MUY cerca.

Bloqueantes reales: **4** (~2-3 horas de trabajo no-dev).
Pendientes recomendados: **6** (~1 día de trabajo).
Mejoras post-launch: lista abierta.

Con los 4 bloqueantes resueltos podemos lanzar un **closed beta a 20-50 usuarios universitarios reales en Quito**. Para abrir al público (Play Store / App Store): completar los pendientes recomendados.

---

## ✅ Lo que está LISTO

| Área | Estado |
|---|---|
| Backend (Supabase) | 65 migrations aplicadas, RLS en TODAS las tablas, 26 RPCs públicas, advisors limpios excepto leaked-password-toggle |
| Catálogo | 1013 cromos del Mundial 2026 (ed. Ecuador con Coca-Cola), 48 países, 8 universidades |
| Auth | Magic link only, deep link callback `cromoswap://auth/callback` funciona, scope auto-incluye self.university |
| Álbum offline-first | SQLite local + sync con debounce 800ms, bulk inserts ~80ms para 1013 cromos |
| Marketplace | venta + paquete + subasta + buy-now, RPCs con CHECK constraints + race-condition unique indexes |
| Social | amigos mutuos (Facebook-style), búsqueda global de personas con filtros, perfil ajeno gated por amistad/scope, bloqueos |
| Realtime | publication con 5 tablas, queries se invalidan en background |
| Notifications | 9 kinds (friend, match, trade, sale, auction settlement) + push directo a Expo (sin secretos) |
| Analytics | PostHog con 18+ eventos: onboarding, engagement, marketplace, social |
| UI/UX | Welcome moderna, tabs limpios, theme picker, ScreenHeader con ícono ⌕ de búsqueda |
| TypeScript | 0 errores |
| EAS Build | `eas.json` con development / preview / production profiles |

---

## 🚨 BLOQUEANTES PARA PROD (4)

### 1. Email Template de magic link en Supabase

**Dónde:** Dashboard → Authentication → Email Templates → "Magic Link"

**Qué hacer:** reemplazar el template default por uno que muestre SOLO el botón con
`{{ .ConfirmationURL }}`. NO incluir `{{ .Token }}` (eso es el OTP code que ya no usamos).

Template recomendado:

```html
<h2>Tu enlace para entrar a Cromo Swap</h2>
<p>Tocá el botón desde el mismo teléfono donde abriste la app:</p>
<p>
  <a href="{{ .ConfirmationURL }}"
     style="background:#0B0B0E;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-family:sans-serif;display:inline-block;">
    Entrar a Cromo Swap
  </a>
</p>
<p style="color:#888;font-size:12px;margin-top:24px">
  Si no fuiste vos, ignorá este correo.
</p>
```

**Sin esto:** el magic link funciona pero el email sigue mostrando el OTP code antiguo, lo cual confunde al user.

### 2. Redirect URLs configuradas en Supabase

**Dónde:** Dashboard → Authentication → URL Configuration → "Redirect URLs"

**Qué hacer:** agregar `cromoswap://auth/callback` a la allowlist.

**Sin esto:** el magic link redirige a una URL no autorizada → error.

### 3. EAS Project ID

**Dónde:** `app.config.ts` línea 67 → `extra.eas.projectId = ''`

**Qué hacer:** correr en terminal:
```bash
eas init
```
Eso genera el projectId y lo escribe automáticamente. Después:
```bash
git add app.config.ts && git commit -m "chore: EAS projectId"
```

**Sin esto:** las push notifications NO funcionan en dev/prod builds (`getExpoPushTokenAsync()` falla sin projectId). En Expo Go se skipea silente, pero al hacer dev build crashea.

### 4. Toggle de leaked-password protection

**Dónde:** Dashboard → Authentication → Settings → "Password protection" → toggle ON.

**Por qué:** Supabase Auth Linter lo marca como warning. Lo bloquea passwords filtradas en HaveIBeenPwned.

**Sin esto:** users podrían registrarse con passwords expuestas en breaches conocidos. Nuestro flujo magic link NO usa password, pero si en algún momento se reactiva, el toggle ya debería estar on.

---

## ⚠️ PENDIENTES RECOMENDADOS (6)

### 1. Borrar 10 edge functions idle

```bash
cd /home/daxrpm/Desktop/Cromos/cromo-swap-app
for fn in create_trade_proposal accept_transaction complete_transaction \
          cancel_transaction propose_match respond_match \
          create_sale_listing create_package_listing create_purchase_request \
          send_push; do
  supabase functions delete $fn
done
```

La app ya no las usa — todo va por RPCs directas a Postgres.

### 2. Conectar Sentry (errores) o usar PostHog Error Tracking

Hoy `captureException` en `src/lib/observability.ts` solo manda `$exception` a PostHog (que SÍ funciona pero no es tan rico como Sentry para stack traces y release tracking). Opciones:

- **Quedarse con PostHog**: cero trabajo, ya funciona.
- **Sumar Sentry**: agregar `@sentry/react-native`, env var `EXPO_PUBLIC_SENTRY_DSN`, conectar en `observability.ts`.

Para una app < 1000 usuarios: PostHog es suficiente. Para producción seria: Sentry.

### 3. Tests (ZERO al día de hoy)

No hay tests unitarios, ni integración, ni E2E. La carpeta `supabase/migrations/0014_enable_pgtap.sql` enables pgTAP pero NO hay tests SQL escritos. Crear mínimo:

- pgTAP suite para RPCs críticas (fn_send_friend_request, fn_create_rating, fn_buy_now_auction)
- Maestro/Detox para 3 flows críticos: signup, marca cromo, propone match

### 4. Páginas de Términos / Privacidad

`app/(app)/about.tsx` tiene links a `https://cromoswap.com/terminos` y `/privacidad` — **el dominio NO existe**.

Opciones:
- Hostear en Vercel / Cloudflare Pages 2 archivos HTML estáticos.
- O usar Notion/Gitbook público.
- Compliance básica (LOPD Ecuador / GDPR si entra UE): nombre + email contacto + qué datos guardamos + cómo borrarlos.

### 5. App icons y splash reales

`assets/icon.png` (4.5KB) y `assets/splash.png` (12KB) son posiblemente los defaults.
Para Android Play Store se requiere icon 512×512 high quality. Diseñar en Figma o usar generador.

### 6. Migrations gap (deuda documentada)

17 migrations existen en el server pero no como archivos locales — documentado en `supabase/migrations/README.md`. Cuando vayas a producción FRESH, antes:
```bash
supabase db pull --schema public,private,storage
```

---

## 📊 Monitoring después del launch

Con PostHog ya conectado, vas a poder ver:

| Métrica | Cómo |
|---|---|
| Funnel onboarding | `magic_link_requested → otp_verified → profile_created` |
| DAU / MAU | Eventos `app_open` agrupados por user |
| Retention | Cohort de `profile_created` y % que vuelven D1, D7, D30 |
| Tiempo a primer match | Distribución entre `profile_created` y `match_proposed` |
| Conversion marketplace | `listing_view → purchase_requested` |
| Health de subastas | `bid_placed` over time, % que llegan a `buy_now_completed` o liquidación |
| Health social | `friend_request_sent` / `friend_accepted` ratio |

Crear dashboards en PostHog Cloud (los 4 que el wizard creó automáticamente son un buen start).

---

## 🚀 Plan de lanzamiento sugerido

### Fase 1: Closed beta (1-2 semanas)
- Resolver 4 bloqueantes
- Build APK con `eas build --profile preview --platform android`
- Distribuir a 20-50 amigos universitarios via link directo (APK install)
- Monitorear PostHog Funnel diario, detectar friction points
- Iterar UX según data

### Fase 2: Open beta (2-4 semanas)
- Resolver pendientes 1-4
- Build production con `eas build --profile production`
- Subir a Google Play Internal Testing primero, después Closed Testing
- Política de privacidad y términos publicados
- Capacity para 500 users sin tocar nada

### Fase 3: Public launch
- Resolver pendiente 5-6
- App Store + Play Store production
- Marketing universitario (afiches, grupos de WhatsApp universitarios, etc.)
- Si supera 1000 DAU: revisar costos Supabase (puede que toque upgrade plan)

---

## 💰 Costos esperados en prod

| Servicio | Free tier | Cuándo upgrade |
|---|---|---|
| Supabase | 500MB DB, 50k MAU, 1GB Storage | Si pasás 50k MAU. Pro: $25/mo |
| PostHog | 1M eventos/mes | Si superás 1M (~ 30k DAU activos). Pay-as-you-go: $0.00031/evento |
| Expo Push | Gratis ilimitado | Nunca |
| EAS Build | 30 builds gratis/mes | Si hacés >30 builds/mes. Production: $99/mo |
| Domain (cromoswap.com) | — | Necesario para terms/privacy (~$10/año) |

Total para 5k DAU: **$0/mes**. Pa 50k DAU: **~$50/mes**.

---

## ⚖️ Riesgos identificados

1. **Backend con admin migrations (0055-0062) NO mías**: hay un módulo admin (reports, bans, audit_log, broadcasts, admin_rpcs) que otro agente trabajó en paralelo. No las auditě yo — depende de qué tan crítico sea para tu modelo.

2. **Catálogo Excel alignment (0066-0076 NO mías)**: otro agente está alineando el catálogo con un Excel real. Si esas migrations rompen FKs con inventory_items, los users perderían su data. Coordinar antes de prod.

3. **Push en iOS requiere certs**: para iOS push, además del EAS projectId hay que configurar APNs en Apple Developer (gratis con cuenta de dev). El flujo de Android Play Store es más simple.

4. **WhatsApp lazy reveal**: el flujo de revelar WhatsApp post-acuerdo funciona pero NO hay rate limit en `fn_create_purchase_request`. Un user malicioso podría spammear listings para forzar miles de tx pending. Considerar rate limit pg_cron + delete o agregar CAPTCHA.
