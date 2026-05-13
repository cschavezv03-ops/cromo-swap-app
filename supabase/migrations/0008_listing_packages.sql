-- =============================================================================
-- Migration: 0008_listing_packages.sql
-- Purpose:   Create listing_packages join table; BEFORE INSERT trigger
--            preventing a cromo already in an active individual listing from
--            also being in a package (and vice versa via 0007 reservation index);
--            RLS (SELECT iff parent listing visible; no client INSERT).
-- Deps:      0007 (listings, private.listing_visible), 0003 (catalog_cromos)
-- Phase:     2 – Data Model & Security Core
--
-- Double-listing protection:
--   Direction 1 (individual → package): the trigger below blocks INSERT into
--     listing_packages if the cromo already has an active individual listing.
--   Direction 2 (package → individual): the reservation partial UNIQUE INDEX
--     in 0007 blocks a second active trade/sale/auction for a cromo that is
--     already in an active package, IF cromo_id is set on the listing.
--     For packages, listings.cromo_id IS NULL (by CHECK), so the unique index
--     doesn't constrain packages → the trigger here is the guard.
--
-- Rollback (-- down):
--   DROP TRIGGER IF EXISTS guard_no_double_listing ON public.listing_packages;
--   DROP FUNCTION IF EXISTS private.guard_no_double_listing() CASCADE;
--   DROP TABLE IF EXISTS public.listing_packages CASCADE;
-- =============================================================================

-- ===========================================================================
-- TABLE: listing_packages
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.listing_packages (
  id         uuid    NOT NULL DEFAULT gen_random_uuid(),
  listing_id uuid    NOT NULL REFERENCES public.listings(id)       ON DELETE CASCADE,
  cromo_id   uuid    NOT NULL REFERENCES public.catalog_cromos(id) ON DELETE RESTRICT,
  quantity   integer NOT NULL DEFAULT 1
               CHECK (quantity > 0),
  CONSTRAINT listing_packages_pkey             PRIMARY KEY (id),
  CONSTRAINT listing_packages_listing_cromo_unique UNIQUE (listing_id, cromo_id)
);

-- ===========================================================================
-- INDEXES
-- ===========================================================================
CREATE INDEX IF NOT EXISTS listing_packages_listing_id_idx ON public.listing_packages (listing_id);
CREATE INDEX IF NOT EXISTS listing_packages_cromo_id_idx   ON public.listing_packages (cromo_id);

-- ===========================================================================
-- TRIGGER: prevent adding a cromo to a package if it's individually listed
-- Checks that the cromo_id being added to this package listing does NOT already
-- have an active individual listing (trade/sale/auction).
-- Note: the reverse direction (adding an individual listing for a cromo in a
-- package) is caught by the partial UNIQUE index in 0007 only if cromo_id IS NOT
-- NULL — for packages cromo_id IS NULL, so that index doesn't help. But inserting
-- an individual listing for a cromo that's in an active package IS possible via
-- the individual listing path if we don't also check. Therefore the guard
-- trigger here also prevents: cromo in active package → block new individual
-- listing. We handle it in the INSERT trigger on listing_packages, not listings,
-- because at INSERT time on listing_packages we can look up both directions.
-- ===========================================================================
CREATE OR REPLACE FUNCTION private.guard_no_double_listing()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  -- Check: does this cromo already have an active individual (trade/sale/auction) listing?
  IF EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.cromo_id = NEW.cromo_id
      AND l.status   = 'active'
      AND l.kind     IN ('trade', 'sale', 'auction')
  ) THEN
    RAISE EXCEPTION
      'cromo % already has an active individual listing; '
      'cannot also be added to a package listing', NEW.cromo_id;
  END IF;

  -- Check: is the parent listing actually a 'package' kind?
  -- (Belt-and-suspenders: the listings CHECK already enforces package/cromo_id,
  --  but enforce here too so listing_packages rows can't be orphaned via edge cases.)
  IF NOT EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id   = NEW.listing_id
      AND l.kind = 'package'
  ) THEN
    RAISE EXCEPTION
      'listing_packages rows can only be added to a listing with kind=''package''';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_no_double_listing
  BEFORE INSERT ON public.listing_packages
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_no_double_listing();

-- ===========================================================================
-- RLS
-- ===========================================================================
ALTER TABLE public.listing_packages ENABLE ROW LEVEL SECURITY;

-- SELECT: iff the parent listing is visible to the viewer.
-- Uses private.listing_visible() from 0007 — reuses the same predicate.
CREATE POLICY "listing_packages_read_visible"
  ON public.listing_packages
  FOR SELECT
  TO authenticated
  USING (private.listing_visible(listing_id));

-- No INSERT policy for client roles. Package creation is an Edge Function
-- operation (Phase 6, service role) that atomically creates the listing row
-- and its package items. Deny by default is correct here for Phase 2.
