# Supabase Migrations — cromo-swap-app

## Overview

All schema changes go through migrations in `supabase/migrations/`. Never run ad-hoc SQL against the live database that isn't captured here.

## Migration files (Phase 2)

| File | What it creates |
|------|----------------|
| `0001_extensions_private_schema.sql` | `moddatetime` ext; `private` schema; `set_updated_at()` trigger fn; REVOKE on private |
| `0002_reference_tables.sql` | `universities` (8 rows), `countries` (16 rows), `rarities` (6 rows); read-only RLS |
| `0003_catalog_cromos.sql` | `catalog_cromos` (240-row seed); `cromo_with_country_rarity` view; read-only RLS |
| `0004_profiles.sql` | `profiles` table; immutable-cols guard trigger; private helpers (`is_blocked`, `in_scope`, `is_guest`, `has_accepted_transaction`); RLS |
| `0005_inventory_items.sql` | `inventory_items` (GENERATED `status` column); indexes; RLS |
| `0006_blocks.sql` | `blocks` (directed, symmetric effect via helper); RLS (blocker-only) |
| `0007_listings.sql` | `listings` (kind/status CHECKs, sparse auction cols); `listing_visible()` helper; reservation partial UNIQUE index; status guard trigger; RLS |
| `0008_listing_packages.sql` | `listing_packages`; no-double-listing guard trigger; RLS (inherits listing visibility) |
| `0009_auction_bids.sql` | `auction_bids`; RLS (SELECT only; no client INSERT — service role via `place_bid` Edge Fn, Phase 7) |
| `0010_transactions.sql` | `transactions` (state-machine table); status guard trigger; RLS (parties SELECT only) |
| `0011_contact_info_view.sql` | `contact_info` SECURITY BARRIER view — **only** path to `whatsapp_phone` for non-owners |
| `0012_notifications.sql` | `notifications`; read-only guard trigger; RLS (SELECT own; UPDATE `read` only) |
| `0013_matches_view.sql` | Supporting indexes; `matches` SECURITY BARRIER view (single-cromo, Phase 2) |
| `0014_enable_pgtap.sql` | Enables `pgtap` extension — **test/dev environments only** |
| `0015_listings_no_double_listing_individual.sql` | Closes the `individual→package` double-listing gap: `BEFORE INSERT` + `BEFORE UPDATE OF cromo_id,status,kind` trigger on `listings` raising P0001 when a cromo already in an active package is individually listed |
| `0016_fk_indexes.sql` | Adds btree indexes on `catalog_cromos(country)`, `catalog_cromos(rarity)`, `transactions(offered_cromo_id)` — flagged by `get_advisors(performance)` as unindexed FKs |
| `0017_profile_contacts.sql` | **Security fix (W2)**: moves `whatsapp_phone` out of `profiles` into a new `profile_contacts` table with its own RLS. Owner has full CRUD; counterparties with an accepted transaction get SELECT only. Drops the old SECURITY DEFINER `contact_info` view and recreates it as a plain `security_invoker = true` view over `profile_contacts`. Removes the advisor warning for `contact_info`. |

## How to apply

```bash
# Apply all migrations to the linked remote project (requires confirmation):
supabase db push

# Or apply one migration at a time via MCP:
# mcp__supabase__apply_migration(name: "0001_extensions_private_schema", query: "<SQL>")
```

**GATE**: Every migration must be reviewed and approved before applying to the live project (`wpcnqfyfcnebtmxstcpo`). The orchestrator confirms before each `apply_migration` call.

## Test suite

```
supabase/tests/rls_test.sql
```

**Run**: `supabase test db`

Covers R13-1 through R13-9 from the Phase 2 spec (57 assertions, `plan(57)`):
- Deny-by-default on every table
- Guest lockout (listings/transactions/auction_bids/others' inventory/others' profiles, profile_contacts)
- Block invisibility (symmetric, both directions)
- Out-of-scope private listing hidden
- WhatsApp via `profile_contacts` table + `contact_info` view — only after accepted transaction (DB-enforced via RLS, not convention)
- `profile_contacts` owner CRUD; non-counterparty isolation; guest isolation
- Reservation unique index rejects second active individual listing
- Price CHECK (>0); E.164 phone CHECK on `profile_contacts`
- No double-listing: **both directions now covered** — package→individual (0008 trigger on `listing_packages`) AND individual→package (0015 trigger on `listings`)

`0014_enable_pgtap.sql` must be applied before running tests (dev/staging only).

## Post-apply checklist (after all 17 migrations are applied)

1. Run `mcp__supabase__get_advisors` (security level) — 2 intentional SECURITY DEFINER VIEW warnings remain (`matches`, `cromo_with_country_rarity`); `contact_info` warning is GONE (0017).
2. Run `mcp__supabase__get_advisors` (performance level) — MUST return zero unexpected warnings
3. Run `mcp__supabase__list_tables` — verify all 12 tables + 3 views present (`profile_contacts` added)
4. Run `supabase test db` — all 57 pgTAP tests green
5. Run `mcp__supabase__generate_typescript_types` → overwrite `src/types/database.ts` and commit

## Security model summary

- **Deny by default**: RLS enabled on every table; no policy = no access.
- **Service-role key**: server-only (Edge Functions). Never in client-reachable code.
- **`(SELECT auth.uid())`** subselect in every policy (never bare `auth.uid()`).
- **`private.*` helpers**: SECURITY DEFINER, `SET search_path = ''`, fully-qualified bodies, REVOKE/GRANT.
- **WhatsApp reveal**: `whatsapp_phone` lives in `profile_contacts` table, RLS-gated to owner + accepted-transaction counterparties. `contact_info` is a plain `security_invoker = true` view over it — the canonical API surface. Client must never query `profiles` for a phone number (the column no longer exists there as of 0017).
- **Reservation lock**: partial UNIQUE index on `listings(cromo_id) WHERE status='active' AND kind IN ('trade','sale','auction')` + `SELECT FOR UPDATE` in the accept Edge Fn (Phase 5).
- **Guest isolation**: `private.is_guest()` reads `is_anonymous` JWT claim; guests cannot see any social surface.
- **Block symmetry**: `private.is_blocked(a,b)` checks both directions; enforced in all policies.

## Security advisor notes

The `get_advisors(security)` tool flags **2** SECURITY DEFINER views (down from 3 after 0017):

- `matches`: calls `private.is_guest()`, `private.is_blocked()`, `private.in_scope()` — all SECURITY DEFINER helpers that require owner rights. `security_barrier=true` is set. Required by design — see §5 matches.
- `cromo_with_country_rarity`: Postgres views default to SECURITY DEFINER (run as owner). The underlying tables have open SELECT policies (`anon, authenticated`). No sensitive data. Acceptable.

`contact_info` is **no longer flagged** — migration 0017 recreated it with `security_invoker = true` as a plain view over `profile_contacts`. The underlying table's RLS (`profile_contacts_owner_select` + `profile_contacts_counterparty_select`) is the enforcement mechanism.

## Known open items

- PUCE email domain: `puce.edu.ec` is used; satellite campus variants (`pucesa.edu.ec`, `pucesi.edu.ec`) TBD. The `email_domain` column is `NULLABLE` to handle this. Confirm in Phase 3.
- `matches` view performance: if average query time > 500ms at scale, migrate to an Edge Function (Phase 10 review).
- `whatsapp_phone` column-level hiding: **CLOSED by 0017**. The phone now lives in `profile_contacts` with its own RLS (owner + accepted-transaction counterparty). DB-enforced, not convention-only. Verify finding W2 is resolved.
- `language sql` vs `language plpgsql` for private helpers: functions that reference tables not yet created at function-creation time use `plpgsql` for deferred body validation. This is documented in `0004_profiles.sql`. The `language sql` versions in the migration files were updated to `plpgsql` to match what was actually applied.
