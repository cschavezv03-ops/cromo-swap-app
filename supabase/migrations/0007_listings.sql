-- =============================================================================
-- Migration: 0007_listings.sql
-- Purpose:   Create listings table with all CHECKs; moddatetime trigger;
--            BEFORE UPDATE guard trigger (status changes denied for client);
--            private.listing_visible() helper; reservation partial UNIQUE index;
--            RLS (own-read ALL, others'-read, INSERT by seller).
-- Deps:      0003 (catalog_cromos), 0004 (profiles, private helpers)
-- Phase:     2 – Data Model & Security Core
--
-- Design decisions:
--   - kind/status = CHECK-text (not PG enums) for easy evolution (decision #2)
--   - Seller's per-listing scope_universities is the SOLE authority for
--     listing visibility; private.in_scope is NOT an OR-branch here (decision #4)
--   - Phase 2 allows seller INSERT of active listing (INSERT policy below);
--     status transitions via Edge Fns only (Phase 5+) — guard trigger enforces
--
-- Rollback (-- down):
--   DROP POLICY IF EXISTS "listings_insert_own"   ON public.listings;
--   DROP POLICY IF EXISTS "listings_read_others"  ON public.listings;
--   DROP POLICY IF EXISTS "listings_own_all"      ON public.listings;
--   DROP TRIGGER IF EXISTS guard_listings_status ON public.listings;
--   DROP FUNCTION IF EXISTS private.guard_listings_status() CASCADE;
--   DROP FUNCTION IF EXISTS private.listing_visible(uuid) CASCADE;
--   DROP INDEX  IF EXISTS listings_cromo_active_unique;
--   DROP TABLE  IF EXISTS public.listings CASCADE;
-- =============================================================================

-- ===========================================================================
-- TABLE: listings
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.listings (
  id                uuid          NOT NULL DEFAULT gen_random_uuid(),
  seller_id         uuid          NOT NULL
                      REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind              text          NOT NULL
                      CHECK (kind IN ('trade','sale','auction','package')),
  status            text          NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','reserved','completed','cancelled')),
  cromo_id          uuid          NULL
                      REFERENCES public.catalog_cromos(id) ON DELETE RESTRICT,
  price             numeric(10,2) NULL
                      CHECK (price > 0),
  negotiable        boolean       NOT NULL DEFAULT false,
  is_public         boolean       NOT NULL,
  scope_universities text[]       NOT NULL DEFAULT '{}',

  -- Auction-specific columns (NULL for non-auction kinds)
  start_price       numeric(10,2) NULL CHECK (start_price > 0),
  current_bid       numeric(10,2) NULL CHECK (current_bid > 0),
  bid_increment     numeric(10,2) NULL CHECK (bid_increment > 0),
  buy_now_price     numeric(10,2) NULL CHECK (buy_now_price > 0),
  ends_at           timestamptz   NULL,
  bids_count        integer       NOT NULL DEFAULT 0 CHECK (bids_count >= 0),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT listings_pkey PRIMARY KEY (id),

  -- package ↔ cromo_id: packages have no single cromo; others do
  CONSTRAINT listings_package_cromo_check
    CHECK ((kind = 'package') = (cromo_id IS NULL)),

  -- auction columns must all be present (or all absent) for auction kind
  CONSTRAINT listings_auction_cols_check
    CHECK (
      (kind = 'auction') = (
        start_price   IS NOT NULL
        AND bid_increment IS NOT NULL
        AND ends_at       IS NOT NULL
      )
    ),

  -- sale must have a price
  CONSTRAINT listings_sale_price_check
    CHECK (kind <> 'sale' OR price IS NOT NULL),

  -- visibility: either public or must have at least one university in scope
  CONSTRAINT listings_visibility_check
    CHECK (is_public OR coalesce(cardinality(scope_universities), 0) > 0)
);

-- ===========================================================================
-- INDEXES
-- ===========================================================================
CREATE INDEX IF NOT EXISTS listings_seller_id_idx ON public.listings (seller_id);
CREATE INDEX IF NOT EXISTS listings_kind_status_idx ON public.listings (kind, status);
CREATE INDEX IF NOT EXISTS listings_cromo_id_idx ON public.listings (cromo_id);
-- Scope array GIN index for the is_public=false visibility predicate
CREATE INDEX IF NOT EXISTS listings_scope_universities_gin
  ON public.listings USING gin (scope_universities);

-- ===========================================================================
-- RESERVATION: partial UNIQUE index
-- A cromo can only have ONE active individual listing (trade/sale/auction).
-- This is the DB-level race-condition guard (§3.6, decision #8).
-- The accept Edge Function (Phase 5) will additionally use SELECT FOR UPDATE.
-- ===========================================================================
CREATE UNIQUE INDEX IF NOT EXISTS listings_cromo_active_unique
  ON public.listings (cromo_id)
  WHERE status = 'active'
    AND kind IN ('trade', 'sale', 'auction');

-- ===========================================================================
-- TRIGGER: updated_at
-- ===========================================================================
CREATE TRIGGER set_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ===========================================================================
-- TRIGGER: guard status changes from client
-- Status transitions are Edge-Function-controlled (Phase 5+).
-- Exception: seller may set status='cancelled' on their own listing
-- (allows un-publishing without an Edge Fn in Phase 2/4 UIs).
-- All other status changes from client roles are denied.
-- ===========================================================================
CREATE OR REPLACE FUNCTION private.guard_listings_status()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  -- Service role (postgres) may change anything
  IF current_user = 'postgres' OR current_user = 'supabase_admin' THEN
    RETURN NEW;
  END IF;

  -- Client may only change status from 'active' → 'cancelled' (their own listing)
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (OLD.status = 'active' AND NEW.status = 'cancelled'
            AND OLD.seller_id = (SELECT auth.uid())) THEN
      RAISE EXCEPTION
        'listings.status transitions are Edge-Function-controlled; '
        'client may only cancel an active listing (active→cancelled)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_listings_status
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_listings_status();

-- ===========================================================================
-- HELPER: private.listing_visible(p_listing_id uuid) → bool
-- Reusable predicate — used by listing_packages (0008) and auction_bids (0009)
-- RLS policies to avoid duplicating the full predicate.
-- Rules:
--   not is_guest
--   not is_blocked(viewer, seller)
--   status in ('active','reserved')
--   is_public=true OR viewer.university ∈ scope_universities
-- NOTE: seller's scope_universities is the SOLE authority (decision #4).
-- ===========================================================================
-- NOTE: uses LANGUAGE plpgsql (not sql) to match the deferred-validation
-- approach used in 0004 for private helpers that call other private helpers.
CREATE OR REPLACE FUNCTION private.listing_visible(p_listing_id uuid)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = p_listing_id
      AND NOT private.is_guest()
      AND NOT private.is_blocked((SELECT auth.uid()), l.seller_id)
      AND l.status IN ('active', 'reserved')
      AND (
        l.is_public
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (SELECT auth.uid())
            AND p.university = ANY(l.scope_universities)
        )
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION private.listing_visible(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.listing_visible(uuid) TO authenticated;

-- ===========================================================================
-- RLS
-- ===========================================================================
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Own listings: seller sees ALL their listings regardless of status
CREATE POLICY "listings_own_all"
  ON public.listings
  FOR ALL
  TO authenticated
  USING     (seller_id = (SELECT auth.uid()))
  WITH CHECK (seller_id = (SELECT auth.uid()) AND status = 'active');

-- Others' read: non-guest, non-blocked, status in (active,reserved),
-- AND (is_public OR viewer.university ∈ scope_universities).
-- seller's scope_universities is the SOLE authority — NOT private.in_scope.
CREATE POLICY "listings_read_others"
  ON public.listings
  FOR SELECT
  TO authenticated
  USING (
    seller_id <> (SELECT auth.uid())
    AND NOT private.is_guest()
    AND NOT private.is_blocked((SELECT auth.uid()), seller_id)
    AND status IN ('active', 'reserved')
    AND (
      is_public
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.university = ANY(scope_universities)
      )
    )
  );

-- Note: no explicit UPDATE/DELETE policy for others' listings or for
-- seller's status transitions — only the guard trigger enforces the
-- active→cancelled shortcut. Full state machine is Phase 5 Edge Fns
-- using the service role (which bypasses RLS).
