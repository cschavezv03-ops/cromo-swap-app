-- =============================================================================
-- Migration: 0006_blocks.sql
-- Purpose:   Create blocks table; UNIQUE(blocker_id, blocked_id); self-block
--            CHECK; index on blocked_id; RLS (blocker full CRUD, nobody else
--            reads).
-- Deps:      0004 (profiles)
-- Phase:     2 – Data Model & Security Core
--
-- NOTE: private.is_blocked (defined in 0004) references this table.
--       The function body is PL/pgSQL-deferred so no chicken-and-egg issue.
--
-- Rollback (-- down):
--   DROP TABLE IF EXISTS public.blocks CASCADE;
-- =============================================================================

-- ===========================================================================
-- TABLE: blocks
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.blocks (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  blocker_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blocks_pkey                PRIMARY KEY (id),
  CONSTRAINT blocks_pair_unique         UNIQUE (blocker_id, blocked_id),
  CONSTRAINT blocks_no_self_block       CHECK  (blocker_id <> blocked_id)
);

-- ===========================================================================
-- INDEXES
-- ===========================================================================
-- Needed by private.is_blocked() to scan both directions efficiently
CREATE INDEX IF NOT EXISTS blocks_blocker_id_idx ON public.blocks (blocker_id);
CREATE INDEX IF NOT EXISTS blocks_blocked_id_idx ON public.blocks (blocked_id);

-- ===========================================================================
-- RLS
-- ===========================================================================
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Blocker has full CRUD on their own block rows.
-- Nobody else can see any block rows — the block list is private.
CREATE POLICY "blocks_own_all"
  ON public.blocks
  FOR ALL
  TO authenticated
  USING     (blocker_id = (SELECT auth.uid()))
  WITH CHECK (blocker_id = (SELECT auth.uid()));
