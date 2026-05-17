# Migrations

Estado real del server (Supabase) vs archivos locales:

## Gap entre server y local

Las siguientes 17 migrations están aplicadas en el server (vivas en
`supabase_migrations.schema_migrations`) pero NO tienen archivo local
porque se aplicaron via MCP `apply_migration` durante el desarrollo:

```
0017_profile_contacts_security_invoker   (20260513020001)
0021_trade_extensions                    (20260515021502)
0022_notifications_triggers              (20260515021616)
0023_edge_idempotency                    (20260515021649)
0024_trade_rpcs                          (20260515023337)
0025_catalog_cromos_redesign             (20260515165410)
0026_inventory_owned_pasted_wanted       (20260515165541)
0027_listings_items_refactor             (20260515165734)
0028_transactions_items_refactor         (20260515165859)
0029_trade_rpcs_v2                       (20260515170108)
0030_matches_table                       (20260515174746)
0031_match_rpcs                          (20260515174842)
0032_match_notifications                 (20260515174924)
0033_sales_rpcs                          (20260515231359)
0034_fix_security_definer_views          (20260516145638)
0035_fix_inventory_status_semantics      (20260516160156)
0036_realtime_publication                (20260516170948)
```

Plus las 5 del catálogo v2 que se aplicaron por batches en server pero
existen consolidadas localmente como `0037_catalog_v2_real.sql` y
`0038_catalog_complete.sql`:

```
catalog_v2_real_part1_countries          (20260516222847)
catalog_v2_cromos_batch_1                (20260516223518)
catalog_v2_cromos_batch_2                (20260516224015)
catalog_v2_cromos_batch_3                (20260516224443)
catalog_v2_cromos_batch_4                (20260516224858)
0038_catalog_complete_part1_wipe_countries (20260517155159)
```

## Recovery

Para regenerar los archivos locales desde el server:

```bash
supabase db pull --schema public,private,storage
```

O, manualmente, dump statement por statement con:

```sql
SELECT name, array_to_string(statements, E'\n') AS sql
FROM supabase_migrations.schema_migrations
WHERE name = '<migration_name>';
```

## Por qué pasó

Durante el desarrollo se usaron las MCP tools de Supabase
(`mcp__supabase__apply_migration`) que aplican directo al server. Esto es
útil para iterar rápido pero deja el repo desincronizado. Las migrations
nuevas (`0049+`) sí se escriben en archivo PRIMERO y después se aplican.

## Reproducibilidad

Mientras el gap exista, NO se puede levantar el proyecto desde cero
solo con `supabase db push` corriendo los archivos locales — faltarían
las 17 migrations. Para producción/staging fresh, hacer `supabase db
pull` antes.
