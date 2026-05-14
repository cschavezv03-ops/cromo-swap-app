-- =============================================================================
-- Migration: 0013_matches_view.sql
-- Purpose:   Supporting indexes for the matches view; create matches view
--            (SECURITY BARRIER, single-cromo, Phase 2 only) computing
--            perfect/multiple/partial/unbalanced matches between the current
--            user and eligible counterparties in scope.
-- Deps:      0005 (inventory_items), 0004 (profiles, private.is_blocked,
--            private.is_guest, private.in_scope)
-- Phase:     2 – Data Model & Security Core
--
-- Phase 2 scope: single-cromo matches only.
--   Package-level match computation deferred to Phase 6.
--   (CLAUDE.md §5, design decision #6)
--
-- Match types (ordered by ease, ascending sort_key):
--   perfect    (0): exactly 1 cromo I can give them AND 1 they can give me
--   multiple   (1): |give| = |get| ≥ 2, balanced multi-swap
--   partial    (2): both |give| ≥ 1 AND |get| ≥ 1 but unbalanced
--   unbalanced (3): one side empty OR heavily one-sided
--
-- Performance note: this view scans inventory_items for scope-filtered users.
--   If average query time > ~500ms at scale → migrate to a match Edge Function
--   (service role, returns pre-filtered rows). Revisit in Phase 10.
--   Track: EXPLAIN ANALYZE SELECT * FROM matches LIMIT 50;
--
-- Rollback (-- down):
--   DROP VIEW IF EXISTS public.matches;
--   DROP INDEX IF EXISTS inventory_items_user_status_idx;  -- created in 0005
--   DROP INDEX IF EXISTS inventory_items_cromo_id_idx;     -- created in 0005
--   DROP INDEX IF EXISTS inventory_items_user_id_idx;      -- created in 0005
--   DROP INDEX IF EXISTS profiles_scope_gin;               -- created in 0004
-- =============================================================================

-- ===========================================================================
-- SUPPORTING INDEXES (if not already created by earlier migrations)
-- 0004 already creates profiles_scope_gin.
-- 0005 already creates inventory_items_cromo_id_idx, user_id_idx,
--      user_status_idx. Listed here for documentation / idempotency.
-- ===========================================================================

-- GIN on profiles.scope — used by in_scope() and the candidates CTE
CREATE INDEX IF NOT EXISTS profiles_scope_gin
  ON public.profiles USING gin (scope);

-- inventory_items indexes (already in 0005; CREATE IF NOT EXISTS is idempotent)
CREATE INDEX IF NOT EXISTS inventory_items_user_id_idx
  ON public.inventory_items (user_id);

CREATE INDEX IF NOT EXISTS inventory_items_cromo_id_idx
  ON public.inventory_items (cromo_id);

CREATE INDEX IF NOT EXISTS inventory_items_user_status_idx
  ON public.inventory_items (user_id, status);

-- ===========================================================================
-- VIEW: matches
-- Security barrier prevents predicate push-down leaks.
-- Executes under OWNER (postgres) rights → can call private.* helpers.
-- GRANT SELECT to authenticated; REVOKE from anon.
--
-- Algorithm:
--   me       → (SELECT auth.uid())
--   surplus  → my inventory rows with status='repeated' (quantity ≥ 2)
--   missing  → my inventory rows with status='missing'  (quantity = 0)
--   candidates → other users in my scope, not blocked
--   i_give   → cromos in my surplus that the candidate is missing
--   i_get    → cromos the candidate has as surplus that I'm missing
--   classify by (give_count, get_count)
-- ===========================================================================
CREATE OR REPLACE VIEW public.matches
  WITH (security_barrier = true)
AS
WITH
  me AS (
    SELECT (SELECT auth.uid()) AS uid
  ),
  my_surplus AS (
    SELECT ii.cromo_id
    FROM public.inventory_items ii, me
    WHERE ii.user_id = me.uid
      AND ii.status  = 'repeated'    -- quantity ≥ 2
  ),
  my_missing AS (
    SELECT ii.cromo_id
    FROM public.inventory_items ii, me
    WHERE ii.user_id = me.uid
      AND ii.status  = 'missing'     -- quantity = 0
  ),
  candidates AS (
    SELECT DISTINCT p.id AS user_id, p.university
    FROM public.profiles p, me
    WHERE p.id          <> me.uid
      AND NOT private.is_guest()
      AND NOT private.is_blocked(me.uid, p.id)
      AND private.in_scope(me.uid, p.university)
  ),
  i_give AS (
    -- Cromos I (surplus) can give to a candidate (missing)
    SELECT c.user_id, ii.cromo_id
    FROM candidates c
    JOIN public.inventory_items ii ON ii.user_id = c.user_id AND ii.status = 'missing'
    JOIN my_surplus s              ON s.cromo_id = ii.cromo_id
  ),
  i_get AS (
    -- Cromos a candidate (surplus) can give to me (missing)
    SELECT c.user_id, ii.cromo_id
    FROM candidates c
    JOIN public.inventory_items ii ON ii.user_id = c.user_id AND ii.status = 'repeated'
    JOIN my_missing m              ON m.cromo_id = ii.cromo_id
  ),
  give_counts AS (
    SELECT user_id, count(*) AS give_n
    FROM i_give
    GROUP BY user_id
  ),
  get_counts AS (
    SELECT user_id, count(*) AS get_n
    FROM i_get
    GROUP BY user_id
  )
SELECT
  c.user_id                            AS counterparty_id,
  c.university,
  COALESCE(g.give_n, 0)               AS give_count,
  COALESCE(t.get_n,  0)               AS get_count,
  CASE
    WHEN COALESCE(g.give_n,0) = 1
     AND COALESCE(t.get_n,0)  = 1     THEN 'perfect'
    WHEN g.give_n = t.get_n
     AND g.give_n >= 2                THEN 'multiple'
    WHEN COALESCE(g.give_n,0) >= 1
     AND COALESCE(t.get_n,0)  >= 1    THEN 'partial'
    ELSE                                   'unbalanced'
  END                                  AS match_type,
  -- Sort key for ORDER BY on client side (lower = better match)
  CASE
    WHEN COALESCE(g.give_n,0) = 1
     AND COALESCE(t.get_n,0)  = 1     THEN 0
    WHEN g.give_n = t.get_n
     AND g.give_n >= 2                THEN 1
    WHEN COALESCE(g.give_n,0) >= 1
     AND COALESCE(t.get_n,0)  >= 1    THEN 2
    ELSE                                   3
  END                                  AS sort_key
FROM candidates c
LEFT JOIN give_counts g ON g.user_id = c.user_id
LEFT JOIN get_counts  t ON t.user_id = c.user_id
WHERE COALESCE(g.give_n, 0) + COALESCE(t.get_n, 0) > 0
ORDER BY sort_key, give_count DESC, get_count DESC;

-- Access control
REVOKE ALL ON public.matches FROM public;
REVOKE ALL ON public.matches FROM anon;
GRANT SELECT ON public.matches TO authenticated;
