-- =============================================================================
-- Migration: 0015_listings_no_double_listing_individual.sql
-- Purpose:   Close the individual→package double-listing gap:
--            BEFORE INSERT (and BEFORE UPDATE OF cromo_id, status, kind) trigger
--            on public.listings that raises P0001 when someone tries to create or
--            activate an individual listing (kind IN ('trade','sale','auction'),
--            status = 'active', cromo_id IS NOT NULL) for a cromo_id that is
--            already part of an active package listing in listing_packages.
--
--            This is the REVERSE direction of the guard_no_double_listing trigger
--            on listing_packages (0008), which catches package→individual.
--            Together the two triggers make double-listing prevention symmetric:
--              • 0008 trigger: prevents adding a cromo to a package if it already
--                has an active individual listing (package→individual direction).
--              • 0015 trigger: prevents creating an individual listing for a cromo
--                that is already in an active package (individual→package direction).
--
-- Deps:      0008 (listing_packages), 0007 (listings)
-- Phase:     2 – Data Model & Security Core
--
-- Rollback (-- down):
--   DROP TRIGGER IF EXISTS guard_no_double_listing_individual ON public.listings;
--   DROP FUNCTION IF EXISTS private.guard_no_double_listing_individual() CASCADE;
-- =============================================================================

-- ===========================================================================
-- TRIGGER FUNCTION: private.guard_no_double_listing_individual()
-- Fires BEFORE INSERT and BEFORE UPDATE OF cromo_id, status, kind on listings.
-- Raises P0001 if the new/updated row would create an active individual listing
-- for a cromo_id that already appears in an active package's listing_packages.
-- ===========================================================================
CREATE OR REPLACE FUNCTION private.guard_no_double_listing_individual()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  -- Only applies to individual listing kinds with an active status and a cromo_id set
  IF NEW.kind NOT IN ('trade', 'sale', 'auction') THEN
    RETURN NEW;
  END IF;

  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  IF NEW.cromo_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check: is this cromo already in an active package listing?
  IF EXISTS (
    SELECT 1
    FROM public.listing_packages lp
    JOIN public.listings l ON l.id = lp.listing_id
    WHERE lp.cromo_id = NEW.cromo_id
      AND l.kind      = 'package'
      AND l.status    = 'active'
  ) THEN
    RAISE EXCEPTION
      'cromo % is already part of an active package listing; '
      'cannot also be listed individually (trade/sale/auction)', NEW.cromo_id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- ===========================================================================
-- TRIGGERS: attach to public.listings
-- BEFORE INSERT: catches new individual listings directly.
-- BEFORE UPDATE OF cromo_id, status, kind: catches updates that would
--   activate or redirect an existing listing into a conflicting state.
-- ===========================================================================
CREATE TRIGGER guard_no_double_listing_individual_insert
  BEFORE INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_no_double_listing_individual();

CREATE TRIGGER guard_no_double_listing_individual_update
  BEFORE UPDATE OF cromo_id, status, kind ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_no_double_listing_individual();
