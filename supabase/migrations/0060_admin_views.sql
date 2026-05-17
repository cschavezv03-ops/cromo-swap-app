-- =============================================================================
-- Migration: 0060_admin_views.sql
-- Purpose:   Read-only views and materialized views used by the admin panel
--            dashboard for KPI computation. Materialized views are refreshed
--            on demand by a Server Action in the panel (Next.js) — pg_cron
--            is left as a follow-up if/when it gets enabled on the project.
--
--            All views are SECURITY INVOKER: callers must already be entitled
--            to see the underlying rows. In practice the admin panel calls
--            these via service-role server-side, which bypasses RLS by design.
--
--            Views provided:
--              - admin_v_user_summary       per-user aggregate counts
--              - admin_v_listing_funnel     status × kind counts
--              - admin_v_transaction_funnel status × kind + completion times
--              - admin_v_university_dist    user counts by university
--              - admin_v_rarity_dist        listing counts by rarity
--              - mv_admin_daily_gmv         daily GMV time series (materialized)
--              - mv_admin_daily_signups     daily new-user counts (materialized)
--              - admin_refresh_mv()         function to refresh all MVs
--
-- Deps:      0004 (profiles), 0005 (inventory_items), 0007 (listings),
--            0009 (auction_bids), 0010 (transactions), 0042 (reports),
--            0043 (bans)
-- Phase:     9 – Admin Panel
--
-- Rollback (-- down):
--   DROP FUNCTION IF EXISTS public.admin_refresh_mv() CASCADE;
--   DROP MATERIALIZED VIEW IF EXISTS public.mv_admin_daily_signups CASCADE;
--   DROP MATERIALIZED VIEW IF EXISTS public.mv_admin_daily_gmv CASCADE;
--   DROP VIEW IF EXISTS public.admin_v_rarity_dist CASCADE;
--   DROP VIEW IF EXISTS public.admin_v_university_dist CASCADE;
--   DROP VIEW IF EXISTS public.admin_v_transaction_funnel CASCADE;
--   DROP VIEW IF EXISTS public.admin_v_listing_funnel CASCADE;
--   DROP VIEW IF EXISTS public.admin_v_user_summary CASCADE;
-- =============================================================================

-- ===========================================================================
-- VIEW: admin_v_user_summary — per-user counts (called sparingly, no MV needed)
-- ===========================================================================
CREATE OR REPLACE VIEW public.admin_v_user_summary
WITH (security_invoker = true)
AS
SELECT
  p.id                                                                                          AS user_id,
  p.display_name,
  p.university,
  p.album_pct,
  p.is_anonymous,
  p.auction_blocked_until,
  p.created_at,
  (SELECT count(*) FROM public.inventory_items i WHERE i.user_id = p.id)                        AS inventory_rows,
  (SELECT coalesce(sum(owned_quantity), 0) FROM public.inventory_items i WHERE i.user_id = p.id) AS owned_total,
  (SELECT count(*) FROM public.listings l WHERE l.seller_id = p.id AND l.status = 'active')     AS active_listings,
  (SELECT count(*) FROM public.listings l WHERE l.seller_id = p.id)                             AS lifetime_listings,
  (SELECT count(*) FROM public.transactions t
     WHERE (t.initiator_id = p.id OR t.owner_id = p.id) AND t.status = 'completed')             AS completed_transactions,
  (SELECT count(*) FROM public.transactions t
     WHERE (t.initiator_id = p.id OR t.owner_id = p.id) AND t.status = 'cancelled')             AS cancelled_transactions,
  (SELECT count(*) FROM public.bans b
     WHERE b.user_id = p.id AND b.lifted_at IS NULL
       AND (b.expires_at IS NULL OR b.expires_at > now()))                                      AS active_bans,
  (SELECT count(*) FROM public.reports r WHERE r.target_type = 'user' AND r.target_id = p.id)   AS reports_against,
  EXISTS (SELECT 1 FROM public.admin_roles a WHERE a.user_id = p.id)                            AS is_admin
FROM public.profiles p;

GRANT SELECT ON public.admin_v_user_summary TO authenticated;

-- ===========================================================================
-- VIEW: admin_v_listing_funnel — listing counts by kind × status
-- ===========================================================================
CREATE OR REPLACE VIEW public.admin_v_listing_funnel
WITH (security_invoker = true)
AS
SELECT
  kind,
  status,
  count(*) AS n,
  count(*) FILTER (WHERE created_at > now() - interval '7 days')  AS n_7d,
  count(*) FILTER (WHERE created_at > now() - interval '30 days') AS n_30d
FROM public.listings
GROUP BY kind, status;

GRANT SELECT ON public.admin_v_listing_funnel TO authenticated;

-- ===========================================================================
-- VIEW: admin_v_transaction_funnel
-- ===========================================================================
CREATE OR REPLACE VIEW public.admin_v_transaction_funnel
WITH (security_invoker = true)
AS
SELECT
  kind,
  status,
  count(*)                                                                  AS n,
  count(*) FILTER (WHERE created_at > now() - interval '7 days')            AS n_7d,
  count(*) FILTER (WHERE created_at > now() - interval '30 days')           AS n_30d,
  avg(extract(epoch FROM (completed_at - created_at))) FILTER (WHERE status = 'completed') AS avg_seconds_to_complete,
  sum(final_price) FILTER (WHERE status = 'completed' AND final_price IS NOT NULL)         AS gmv_total,
  avg(final_price) FILTER (WHERE status = 'completed' AND final_price IS NOT NULL)         AS aov
FROM public.transactions
GROUP BY kind, status;

GRANT SELECT ON public.admin_v_transaction_funnel TO authenticated;

-- ===========================================================================
-- VIEW: admin_v_university_dist
-- ===========================================================================
CREATE OR REPLACE VIEW public.admin_v_university_dist
WITH (security_invoker = true)
AS
SELECT
  coalesce(p.university, '(none)') AS university,
  count(*)                          AS users_total,
  count(*) FILTER (WHERE p.is_anonymous IS FALSE) AS users_real,
  count(*) FILTER (WHERE p.is_anonymous IS TRUE)  AS users_guest,
  avg(p.album_pct) FILTER (WHERE p.album_pct IS NOT NULL) AS avg_album_pct
FROM public.profiles p
GROUP BY p.university;

GRANT SELECT ON public.admin_v_university_dist TO authenticated;

-- ===========================================================================
-- VIEW: admin_v_rarity_dist
-- ===========================================================================
CREATE OR REPLACE VIEW public.admin_v_rarity_dist
WITH (security_invoker = true)
AS
SELECT
  cc.rarity_id,
  r.label   AS rarity_label,
  r.sort_order,
  count(l.id)                                                AS listings_total,
  count(l.id) FILTER (WHERE l.status = 'active')             AS listings_active,
  count(l.id) FILTER (WHERE l.kind = 'sale')                 AS listings_sale,
  count(l.id) FILTER (WHERE l.kind = 'auction')              AS listings_auction,
  avg(l.price) FILTER (WHERE l.kind = 'sale' AND l.price IS NOT NULL) AS avg_sale_price
FROM public.catalog_cromos cc
LEFT JOIN public.rarities r ON r.id = cc.rarity_id
LEFT JOIN public.listing_items li ON li.cromo_id = cc.id
LEFT JOIN public.listings  l ON l.id = li.listing_id
GROUP BY cc.rarity_id, r.label, r.sort_order
ORDER BY r.sort_order NULLS LAST;

GRANT SELECT ON public.admin_v_rarity_dist TO authenticated;

-- ===========================================================================
-- MATERIALIZED VIEW: mv_admin_daily_gmv (refresh on demand)
-- ===========================================================================
DROP MATERIALIZED VIEW IF EXISTS public.mv_admin_daily_gmv;
CREATE MATERIALIZED VIEW public.mv_admin_daily_gmv AS
SELECT
  date_trunc('day', completed_at)::date AS day,
  kind,
  count(*)                              AS tx_count,
  sum(final_price)                      AS gmv,
  avg(final_price)                      AS aov
FROM public.transactions
WHERE status = 'completed'
  AND completed_at IS NOT NULL
  AND final_price IS NOT NULL
GROUP BY 1, 2;

CREATE UNIQUE INDEX IF NOT EXISTS mv_admin_daily_gmv_day_kind_uidx
  ON public.mv_admin_daily_gmv (day, kind);

GRANT SELECT ON public.mv_admin_daily_gmv TO authenticated;

-- ===========================================================================
-- MATERIALIZED VIEW: mv_admin_daily_signups (refresh on demand)
-- Reads auth.users.created_at directly; only authenticated callers granted
-- but the panel uses service-role anyway.
-- ===========================================================================
DROP MATERIALIZED VIEW IF EXISTS public.mv_admin_daily_signups;
CREATE MATERIALIZED VIEW public.mv_admin_daily_signups AS
SELECT
  date_trunc('day', u.created_at)::date AS day,
  count(*) FILTER (WHERE u.is_anonymous IS FALSE) AS signups_real,
  count(*) FILTER (WHERE u.is_anonymous IS TRUE)  AS signups_guest,
  count(*)                                         AS signups_total
FROM auth.users u
GROUP BY 1;

CREATE UNIQUE INDEX IF NOT EXISTS mv_admin_daily_signups_day_uidx
  ON public.mv_admin_daily_signups (day);

GRANT SELECT ON public.mv_admin_daily_signups TO authenticated;

-- ===========================================================================
-- FUNCTION: admin_refresh_mv() — admin-gated MV refresher
-- Called from the admin panel via supabase.rpc('admin_refresh_mv').
-- CONCURRENTLY where possible (requires the unique indexes created above).
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.admin_refresh_mv()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_admin_daily_gmv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_admin_daily_signups;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_refresh_mv() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_refresh_mv() TO authenticated;
