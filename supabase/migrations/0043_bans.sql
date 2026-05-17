-- =============================================================================
-- Migration: 0043_bans.sql
-- Purpose:   Generalized ban system. Extends the existing single-purpose
--            profiles.auction_blocked_until field with a proper bans table
--            that supports multiple scopes (auction, trade, sale, all),
--            audit trail (banned_by, reason, lifted_by), permanent or
--            time-limited bans, and lift history.
--
--            Backward compatibility: the existing auction_blocked_until
--            field continues to work — the admin panel keeps it in sync
--            when a scope='auction' or 'all' ban is created so legacy
--            mobile code that reads that field still respects new bans.
--
--            private.is_banned(user, scope) helper returns true iff the
--            user has an active ban for the given scope (or 'all').
--
-- Deps:      0004 (profiles), 0001 (private schema)
-- Phase:     9 – Admin Panel
--
-- Rollback (-- down):
--   DROP POLICY IF EXISTS "bans_self_read" ON public.bans;
--   DROP FUNCTION IF EXISTS private.is_banned(uuid, public.ban_scope) CASCADE;
--   DROP TABLE IF EXISTS public.bans CASCADE;
--   DROP TYPE IF EXISTS public.ban_scope CASCADE;
-- =============================================================================

-- ===========================================================================
-- ENUM: ban_scope
-- ===========================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ban_scope') THEN
    CREATE TYPE public.ban_scope AS ENUM ('auction', 'trade', 'sale', 'all');
  END IF;
END$$;

-- ===========================================================================
-- TABLE: bans
-- expires_at = NULL → permanent ban.
-- lifted_at  != NULL → ban manually lifted (still kept for history).
-- A ban is "active" iff lifted_at IS NULL AND (expires_at IS NULL OR expires_at > now()).
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.bans (
  id          uuid             NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid             NOT NULL
                REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope       public.ban_scope NOT NULL,
  reason      text             NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 500),
  banned_by   uuid             NULL
                REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at  timestamptz      NULL,
  lifted_at   timestamptz      NULL,
  lifted_by   uuid             NULL
                REFERENCES public.profiles(id) ON DELETE SET NULL,
  lifted_note text             NULL,
  created_at  timestamptz      NOT NULL DEFAULT now(),
  CONSTRAINT bans_pkey PRIMARY KEY (id),
  CONSTRAINT bans_lifted_consistency CHECK (
    (lifted_at IS NULL AND lifted_by IS NULL AND lifted_note IS NULL)
    OR
    (lifted_at IS NOT NULL)
  )
);

-- Partial index over active bans only — keeps the hot-path is_banned() lookups fast.
CREATE INDEX IF NOT EXISTS bans_user_scope_active_idx
  ON public.bans (user_id, scope)
  WHERE lifted_at IS NULL AND (expires_at IS NULL OR expires_at > now());

CREATE INDEX IF NOT EXISTS bans_user_id_idx     ON public.bans (user_id);
CREATE INDEX IF NOT EXISTS bans_banned_by_idx   ON public.bans (banned_by) WHERE banned_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS bans_created_at_idx  ON public.bans (created_at DESC);

-- ===========================================================================
-- RLS
-- ===========================================================================
ALTER TABLE public.bans ENABLE ROW LEVEL SECURITY;

-- Self-read: a banned user can see why they're banned.
CREATE POLICY "bans_self_read"
  ON public.bans
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- INSERT / UPDATE / DELETE: no client policy. Service-role only (admin panel).

-- ===========================================================================
-- HELPER: private.is_banned(uuid, ban_scope)
-- Returns true iff the user has an active ban for the given scope OR scope='all'.
-- Note: index is partial on "active" so this scan is cheap even on a large table.
-- ===========================================================================
CREATE OR REPLACE FUNCTION private.is_banned(p_user uuid, p_scope public.ban_scope)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  IF p_user IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.bans
    WHERE user_id = p_user
      AND (scope = p_scope OR scope = 'all'::public.ban_scope)
      AND lifted_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$;

REVOKE ALL ON FUNCTION private.is_banned(uuid, public.ban_scope) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_banned(uuid, public.ban_scope) TO authenticated;
