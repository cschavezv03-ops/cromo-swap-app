# Migraciones Supabase — Estado actual

## Linealidad disco ↔ server

Las migraciones se aplicaron al server **vía MCP** durante el desarrollo. Por
limitaciones de la herramienta, el SQL de muchas de ellas **no quedó
volcado a disco**.

### Migraciones presentes en `supabase/migrations/` (en disco)

```
0001_extensions_private_schema.sql
0002_reference_tables.sql
0003_catalog_cromos.sql
0004_profiles.sql
0005_inventory_items.sql
0006_blocks.sql
0007_listings.sql
0008_listing_packages.sql
0009_auction_bids.sql
0010_transactions.sql
0011_contact_info_view.sql
0012_notifications.sql
0013_matches_view.sql
0014_enable_pgtap.sql
0015_listings_no_double_listing_individual.sql
0016_fk_indexes.sql
0017_profile_contacts.sql
0018_fix_in_scope.sql
0019_guard_triggers_security_invoker.sql
0020_auth_onboarding.sql
0037_catalog_v2_real.sql            # versión inicial (220 cromos faltantes)
0038_catalog_complete.sql           # versión final 1013 cromos + wipe v1
0039_marketplace_rpcs.sql           # auction RPCs + ban trigger
0040_fk_indexes_e2e_audit.sql       # 2 FK indexes faltantes (E2E audit)
```

### Migraciones aplicadas en server pero **NO en disco**

```
0021_trade_extensions            # bumpeos a listings/transactions
0022_notifications_triggers      # triggers que emiten notifications
0023_edge_idempotency            # tabla de idempotencia para edge fns
0024_trade_rpcs                  # fn_propose_match, fn_respond_match, etc.
0025_catalog_cromos_redesign     # bumpeo columnas catalog
0026_inventory_owned_pasted_wanted
0027_listings_items_refactor     # listing_packages → listing_items
0028_transactions_items_refactor
0029_trade_rpcs_v2               # versión final de las RPCs trade
0030_matches_table               # tabla matches (antes solo view suggestions)
0031_match_rpcs
0032_match_notifications
0033_sales_rpcs                  # fn_create_sale_listing, etc.
0034_fix_security_definer_views
0035_fix_inventory_status_semantics  # owned=1 → have, >=2 → repeated
0036_realtime_publication            # broadcast en transactions/matches/etc
catalog_v2_real_part1_countries      # parte del 0038 antes del rename
catalog_v2_cromos_batch_1            # /
catalog_v2_cromos_batch_2            # /  los 4 chunks que hizo el agent A2
catalog_v2_cromos_batch_3            # /  para no superar el límite de tamaño
catalog_v2_cromos_batch_4            # /  por MCP `apply_migration`
0038_catalog_complete_part1_wipe_countries  # remate de wipe + 48 countries
```

### Por qué pasó esto

Durante el proyecto se usó la combinación de Claude Code + Supabase MCP que
permite `apply_migration` directo contra el server (Postgres) sin pasar por
el CLI local. El SQL queda registrado en `supabase_migrations.schema_migrations`
del server, pero **el script no se conserva**.

Resultado: si alguien hace `supabase db reset` apuntando al server, las
migraciones aplicadas vía MCP **no se replicarán** porque el server las
considera ya aplicadas, pero el contenido se perdió.

### Cómo cerrar el gap (cuando haya tiempo)

1. Tener el CLI de Supabase autenticado contra el proyecto.
2. Correr `supabase db pull --schema public,private` para regenerar el SQL
   de cada migración faltante a partir del schema vivo. Eso producirá un
   archivo nuevo en `supabase/migrations/` con timestamp actual y todo el
   delta consolidado.
3. Renombrar/limpiar a una secuencia coherente.

### A futuro

**Todas las migraciones nuevas deben escribirse primero en disco** y
aplicarse con `supabase db push` o, si se usa MCP, también crear el
archivo en `supabase/migrations/` en el mismo commit.

## Estado del catálogo

- `catalog_cromos`: **1013 filas v2 activas**, 0 v1.
- Distribución: 48 países × 20 (960) + FWC (9) + MUSEUM (11) + COCA (13) + EXTRA (20).
- `countries`: 48 selecciones del Mundial 2026.
- `rarities`: 6 (común, poco, raro, muy raro, especial, legendario).
- `universities`: 8 con dominios institucionales de Quito.

## Validación Fase 8 (audit E2E)

- TS strict: 0 errores
- Android bundle: compila (6.5 MB Hermes)
- `expo-doctor`: 18/18 ✓
- 0 strings rioplatenses
- 0 `any` types
- 0 huérfanos en `inventory_items`, `listings`, `matches`
- Cobertura RPC frontend↔server: 14/14 (100%)
- 21 routes en `app/`, todas con loading + empty states
- Realtime publication activa para `matches`/`transactions`/`notifications`/`transaction_items`

### Advisores que NO se cerraron (intencional)

- 5 funciones `SECURITY DEFINER` ejecutables por `authenticated`:
  `fn_close_auction`, `fn_create_auction_listing`, `fn_pause_listing`,
  `fn_place_bid`, `fn_resume_listing`. **Necesarias así** — modifican
  estado en filas que no le pertenecen al caller (`auction_blocked_until`
  en otro user, `listings.status` cuando el seller pausa, etc.). El
  brief de seguridad lo hicimos defensivo: cada función valida `auth.uid()`
  contra el seller_id antes de mutar.
- "Leaked password protection disabled": requiere toggle en el dashboard
  → `Authentication → Settings → Enable password protection`. No es
  fixable por migración.
- 12 "unused indexes": la app aún no tiene tráfico real, el advisor
  reporta `pg_stat_user_indexes` que está vacío. No es un problema.
- 4 "multiple permissive policies": cosméticas, las RLS funcionan bien.
  Optimización futura.
