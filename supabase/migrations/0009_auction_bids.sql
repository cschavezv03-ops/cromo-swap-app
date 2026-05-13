-- =============================================================================
-- Migration: 0009_auction_bids.sql
-- Purpose:   Create auction_bids table; RLS (SELECT for eligible viewers;
--            NO INSERT policy → service role only via place_bid Edge Fn,
--            Phase 7).
-- Deps:      0007 (listings, private.listing_visible), 0004 (profiles)
-- Phase:     2 – Data Model & Security Core
--
-- NOTE: No INSERT policy is intentional for Phase 2. The place_bid Edge
--       Function (Phase 7) uses the service role to insert bids atomically
--       (validating amount ≥ current_bid + increment, updating listings.current_bid,
--       incrementing bids_count). Any client INSERT attempt is denied by
--       deny-by-default RLS.
--
-- Rollback (-- down):
--   DROP TABLE IF EXISTS public.auction_bids CASCADE;
-- =============================================================================

-- ===========================================================================
-- TABLE: auction_bids
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.auction_bids (
  id         uuid          NOT NULL DEFAULT gen_random_uuid(),
  listing_id uuid          NOT NULL REFERENCES public.listings(id)  ON DELETE CASCADE,
  bidder_id  uuid          NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  amount     numeric(10,2) NOT NULL CHECK (amount > 0),
  created_at timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT auction_bids_pkey PRIMARY KEY (id)
);

-- ===========================================================================
-- INDEXES
-- ===========================================================================
CREATE INDEX IF NOT EXISTS auction_bids_listing_id_idx ON public.auction_bids (listing_id);
CREATE INDEX IF NOT EXISTS auction_bids_bidder_id_idx  ON public.auction_bids (bidder_id);
-- For "latest bid" queries
CREATE INDEX IF NOT EXISTS auction_bids_listing_created_idx
  ON public.auction_bids (listing_id, created_at DESC);

-- ===========================================================================
-- RLS
-- ===========================================================================
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;

-- SELECT: own bids (always visible to the bidder) OR bids on a visible auction.
-- Uses private.listing_visible() from 0007.
CREATE POLICY "auction_bids_read"
  ON public.auction_bids
  FOR SELECT
  TO authenticated
  USING (
    bidder_id = (SELECT auth.uid())
    OR private.listing_visible(listing_id)
  );

-- NOTE: No INSERT / UPDATE / DELETE policy for authenticated role.
-- INSERT is handled by the place_bid Edge Function (service role, Phase 7).
-- Deny-by-default is in effect for Phase 2.
