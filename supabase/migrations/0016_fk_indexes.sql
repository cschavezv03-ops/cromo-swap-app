-- =============================================================================
-- Migration: 0016_fk_indexes.sql
-- Purpose:   Add missing btree indexes on foreign key columns flagged by
--            mcp__supabase__get_advisors (performance, unindexed_foreign_keys).
--
--            Three FKs lacked a covering index after 0001–0015:
--              1. catalog_cromos.country → countries(code)
--              2. catalog_cromos.rarity  → rarities(id)
--              3. transactions.offered_cromo_id → catalog_cromos(id)
--
--            Assessment:
--              • catalog_cromos.country / .rarity: countries (16 rows) and
--                rarities (6 rows) are tiny reference tables. Sequential scans
--                on them are negligible. However indexes on the FK side
--                (catalog_cromos) benefit JOIN queries (cromo_with_country_rarity
--                view, filtered catalog queries). Low cost, positive effect.
--              • transactions.offered_cromo_id: nullable; most transaction queries
--                filter by initiator_id/owner_id (already indexed). Still correct
--                to index for FK cascade and cromo-centric queries.
--
--            Security DEFINER view warnings (matches, contact_info,
--            cromo_with_country_rarity) from get_advisors security are
--            INTENTIONAL — see supabase/README.md § Security model for rationale.
--            Multiple permissive RLS policy WARNs are expected (own-row + others'
--            is the canonical Supabase split-policy pattern).
--            Unused index INFOs are expected on a fresh database with no traffic.
--
-- Deps:      0003 (catalog_cromos, countries, rarities), 0010 (transactions)
-- Phase:     2 – Data Model & Security Core (post-apply cleanup)
--
-- Rollback (-- down):
--   DROP INDEX IF EXISTS catalog_cromos_country_idx;
--   DROP INDEX IF EXISTS catalog_cromos_rarity_idx;
--   DROP INDEX IF EXISTS transactions_offered_cromo_id_idx;
-- =============================================================================

CREATE INDEX IF NOT EXISTS catalog_cromos_country_idx
  ON public.catalog_cromos (country);

CREATE INDEX IF NOT EXISTS catalog_cromos_rarity_idx
  ON public.catalog_cromos (rarity);

CREATE INDEX IF NOT EXISTS transactions_offered_cromo_id_idx
  ON public.transactions (offered_cromo_id)
  WHERE offered_cromo_id IS NOT NULL;
