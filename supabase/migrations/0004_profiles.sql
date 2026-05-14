-- =============================================================================
-- Migration: 0004_profiles.sql
-- Purpose:   Create profiles table; moddatetime updated_at trigger; BEFORE
--            UPDATE guard trigger (university/is_anonymous/auction_blocked_until
--            immutable from client); private helpers is_blocked, in_scope,
--            is_guest, has_accepted_transaction; RLS (own-row ALL; others' read
--            iff not-guest, not-blocked, in-scope OR accepted-tx).
-- Deps:      0002 (universities), 0001 (set_updated_at, private schema)
-- Phase:     2 – Data Model & Security Core
--
-- IMPORTANT — Forward reference to transactions table (0010):
--   private.has_accepted_transaction references public.transactions which
--   doesn't exist yet when this migration runs. Two clean options were
--   considered:
--     A) Stub the function body referencing a not-yet-existing table (PL/pgSQL
--        won't validate body at CREATE FUNCTION time — it resolves at call time).
--     B) Create a forward-declared stub and replace in 0010.
--   Decision: Option A — PL/pgSQL body validation is deferred, so the function
--   can reference public.transactions safely. The function will error only if
--   called before 0010 runs, which never happens on a clean apply. This avoids
--   the ALTER in 0010 and keeps the function fully defined here (canonical home).
--   The other-profiles SELECT policy uses has_accepted_transaction — it will
--   work correctly once both 0004 and 0010 are applied.
--
-- Rollback (-- down):
--   DROP POLICY IF EXISTS "profiles_read_others"  ON public.profiles;
--   DROP POLICY IF EXISTS "profiles_own_all"       ON public.profiles;
--   DROP TRIGGER IF EXISTS guard_profiles_immutable_cols ON public.profiles;
--   DROP FUNCTION IF EXISTS private.guard_profiles_immutable_cols() CASCADE;
--   DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
--   DROP FUNCTION IF EXISTS private.has_accepted_transaction(uuid, uuid) CASCADE;
--   DROP FUNCTION IF EXISTS private.is_guest() CASCADE;
--   DROP FUNCTION IF EXISTS private.in_scope(uuid, text) CASCADE;
--   DROP FUNCTION IF EXISTS private.is_blocked(uuid, uuid) CASCADE;
--   DROP TABLE IF EXISTS public.profiles CASCADE;
-- =============================================================================

-- ===========================================================================
-- TABLE: profiles
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    uuid        NOT NULL
                          REFERENCES auth.users(id) ON DELETE CASCADE,
  university            text        NULL
                          REFERENCES public.universities(id) ON DELETE RESTRICT,
  display_name          text        NOT NULL,
  whatsapp_phone        text        NULL
                          CHECK (whatsapp_phone ~ '^\+[1-9]\d{6,14}$'),
  scope                 text[]      NOT NULL DEFAULT '{}',
  album_pct             integer     NULL
                          CHECK (album_pct BETWEEN 0 AND 100),
  auction_blocked_until timestamptz NULL,
  is_anonymous          boolean     NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- Index: scope (GIN for array operations) — supports in_scope lookups + matches view
CREATE INDEX IF NOT EXISTS profiles_scope_gin ON public.profiles USING gin (scope);
-- Index: university — supports in_scope predicate
CREATE INDEX IF NOT EXISTS profiles_university_idx ON public.profiles (university);

-- ===========================================================================
-- TRIGGER: updated_at via moddatetime
-- ===========================================================================
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ===========================================================================
-- TRIGGER: guard immutable columns
--   university, is_anonymous, auction_blocked_until must not be client-writable.
--   They may only change via SECURITY DEFINER Edge Functions / service role.
--   Implementation: if the calling role is NOT the postgres/service role,
--   raise an error when any guarded column changes.
--   Supabase sets request.jwt.claims; when a client calls UPDATE profiles,
--   the session role is 'authenticated'. Service-role calls bypass RLS entirely
--   (they never hit this trigger because triggers DO run, but we check the role).
--   Strategy: raise if any guarded column changed AND current_user ≠ 'postgres'.
-- ===========================================================================
CREATE OR REPLACE FUNCTION private.guard_profiles_immutable_cols()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  -- Allow service-role (postgres) to change these freely
  IF current_user = 'postgres' OR current_user = 'supabase_admin' THEN
    RETURN NEW;
  END IF;

  IF NEW.university            IS DISTINCT FROM OLD.university THEN
    RAISE EXCEPTION 'profiles.university is not client-writable; set via the university-derivation Edge Function';
  END IF;
  IF NEW.is_anonymous          IS DISTINCT FROM OLD.is_anonymous THEN
    RAISE EXCEPTION 'profiles.is_anonymous is not client-writable';
  END IF;
  IF NEW.auction_blocked_until IS DISTINCT FROM OLD.auction_blocked_until THEN
    RAISE EXCEPTION 'profiles.auction_blocked_until is not client-writable; managed by the auction-penalty Edge Function';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_profiles_immutable_cols
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_profiles_immutable_cols();

-- ===========================================================================
-- PRIVATE HELPER FUNCTIONS
-- All: SECURITY DEFINER, SET search_path = '', STABLE, fully-qualified bodies.
-- REVOKE from public/anon/authenticated; GRANT EXECUTE to authenticated.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- private.is_blocked(a uuid, b uuid) → bool
-- Returns true if EITHER direction of a block exists between a and b.
-- Symmetric — §3.4.
--
-- NOTE: references public.blocks (created in 0006). Uses LANGUAGE plpgsql
-- for deferred body validation (plpgsql validates at call time, not CREATE
-- time). `language sql` would fail at CREATE FUNCTION time since public.blocks
-- doesn't exist yet when 0004 runs.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.is_blocked(a uuid, b uuid)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = a AND blocked_id = b)
       OR (blocker_id = b AND blocked_id = a)
  );
END;
$$;

REVOKE ALL ON FUNCTION private.is_blocked(uuid, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_blocked(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- private.in_scope(viewer uuid, target_university text) → bool
-- Returns true iff target_university is in the viewer's scope array.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.in_scope(viewer uuid, target_university text)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  RETURN (
    target_university IS NOT NULL
    AND target_university = ANY (
      SELECT scope FROM public.profiles WHERE id = viewer
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION private.in_scope(uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.in_scope(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- private.is_guest() → bool
-- Reads the is_anonymous claim from the JWT.
-- Defaults to FALSE when absent (normal/legacy session, not a guest).
-- Supabase anonymous sign-in ALWAYS sets is_anonymous=true in the JWT.
-- See design note: defaulting false is safer against accidental lockout.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.is_guest()
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  RETURN coalesce(
    (auth.jwt() ->> 'is_anonymous')::boolean,
    false
  );
END;
$$;

REVOKE ALL ON FUNCTION private.is_guest() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_guest() TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- private.has_accepted_transaction(a uuid, b uuid) → bool
-- Returns true iff a 'accepted' status transaction exists between a and b
-- (in either initiator/owner direction).
-- NOTE: references public.transactions (created in 0010). PL/pgSQL body
-- validation is deferred so this is safe to create here; it resolves at
-- call time. Will fail if called before 0010 is applied (never on clean apply).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.has_accepted_transaction(a uuid, b uuid)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.transactions
    WHERE status = 'accepted'
      AND (
        (initiator_id = a AND owner_id = b)
        OR
        (initiator_id = b AND owner_id = a)
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION private.has_accepted_transaction(uuid, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.has_accepted_transaction(uuid, uuid) TO authenticated;

-- ===========================================================================
-- RLS
-- ===========================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Own-row: authenticated user can SELECT/UPDATE their own row.
-- UPDATE column restrictions enforced by the guard trigger above.
CREATE POLICY "profiles_own_all"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING     (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- Others' read: non-guest, non-blocked, AND (in-scope OR shared accepted tx).
-- IMPORTANT: whatsapp_phone is NOT excluded at the RLS row level (Postgres RLS
-- is row-level, not column-level). Mitigation: client app NEVER selects
-- whatsapp_phone from profiles directly — the canonical path is the
-- contact_info view (created in 0011), which is gated by has_accepted_transaction.
-- If column-level hiding proves necessary, split whatsapp_phone to profile_contacts
-- (documented follow-up — see design open items).
CREATE POLICY "profiles_read_others"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id <> (SELECT auth.uid())
    AND NOT private.is_guest()
    AND NOT private.is_blocked((SELECT auth.uid()), id)
    AND (
      private.in_scope((SELECT auth.uid()), university)
      OR private.has_accepted_transaction((SELECT auth.uid()), id)
    )
  );
