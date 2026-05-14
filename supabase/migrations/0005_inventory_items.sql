-- =============================================================================
-- Migration: 0005_inventory_items.sql
-- Purpose:   Create inventory_items table; GENERATED STORED status column;
--            UNIQUE(user_id, cromo_id); moddatetime trigger; indexes; RLS
--            (own-row ALL; others' SELECT iff non-guest, non-blocked, in-scope).
-- Deps:      0003 (catalog_cromos), 0004 (profiles, private.is_blocked,
--            private.is_guest, private.in_scope)
-- Phase:     2 – Data Model & Security Core
--
-- Design decision #3: status is GENERATED ALWAYS AS STORED — single source of
-- truth derived from quantity. Not a view expression, so it's indexable and
-- queryable without a join.
--
-- Rollback (-- down):
--   DROP TABLE IF EXISTS public.inventory_items CASCADE;
-- =============================================================================

-- ===========================================================================
-- TABLE: inventory_items
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id        uuid    NOT NULL DEFAULT gen_random_uuid(),
  user_id   uuid    NOT NULL REFERENCES public.profiles(id)        ON DELETE CASCADE,
  cromo_id  uuid    NOT NULL REFERENCES public.catalog_cromos(id)  ON DELETE RESTRICT,
  quantity  integer NOT NULL DEFAULT 0
              CHECK (quantity >= 0),
  -- GENERATED column: derived from quantity; never written directly.
  status    text    GENERATED ALWAYS AS (
              CASE
                WHEN quantity = 0 THEN 'missing'
                WHEN quantity = 1 THEN 'have'
                ELSE                   'repeated'
              END
            ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_items_pkey                  PRIMARY KEY (id),
  CONSTRAINT inventory_items_user_cromo_unique     UNIQUE (user_id, cromo_id)
);

-- ===========================================================================
-- INDEXES
-- ===========================================================================
CREATE INDEX IF NOT EXISTS inventory_items_user_id_idx     ON public.inventory_items (user_id);
CREATE INDEX IF NOT EXISTS inventory_items_cromo_id_idx    ON public.inventory_items (cromo_id);
-- Composite index used by matches view and status-filtered queries
CREATE INDEX IF NOT EXISTS inventory_items_user_status_idx ON public.inventory_items (user_id, status);
-- Partial index: repeated items are the trade candidates — frequently filtered
CREATE INDEX IF NOT EXISTS inventory_items_repeated_idx
  ON public.inventory_items (user_id, cromo_id)
  WHERE status = 'repeated';

-- ===========================================================================
-- TRIGGER: updated_at
-- ===========================================================================
CREATE TRIGGER set_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ===========================================================================
-- RLS
-- ===========================================================================
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Own-row: ALL operations. Guests (is_anonymous=true) are also 'authenticated'
-- in Supabase's anonymous session model, so they can touch their own inventory.
-- This is correct: guests track their own album (CLAUDE.md §4.9 — "album
-- tracking only" for guests).
CREATE POLICY "inventory_own_all"
  ON public.inventory_items
  FOR ALL
  TO authenticated
  USING     (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Others' read: non-guest, non-blocked, and the target user's university is
-- in the viewer's scope. Uses a correlated subquery to look up the target's
-- university without a JOIN (safe with RLS + SECURITY DEFINER helper).
CREATE POLICY "inventory_read_others"
  ON public.inventory_items
  FOR SELECT
  TO authenticated
  USING (
    user_id <> (SELECT auth.uid())
    AND NOT private.is_guest()
    AND NOT private.is_blocked((SELECT auth.uid()), user_id)
    AND private.in_scope(
          (SELECT auth.uid()),
          (SELECT university FROM public.profiles WHERE id = user_id)
        )
  );
