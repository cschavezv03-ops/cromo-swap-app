-- =============================================================================
-- Migration: 0012_notifications.sql
-- Purpose:   Create notifications table; BEFORE UPDATE guard trigger (client
--            may only change the `read` column); RLS (SELECT own; UPDATE own;
--            no client INSERT — service role / triggers only).
-- Deps:      0004 (profiles)
-- Phase:     2 – Data Model & Security Core
--
-- NOTE: No INSERT policy for client roles. Notifications are created by:
--       - DB triggers on transactions/listings state changes (Phase 5+)
--       - Edge Functions (service role) on relevant events
--       Client cannot create notifications directly.
--
-- Notification kinds (for documentation; not enforced at schema level in Phase 2):
--   trade_request | trade_accepted | outbid | auction_ending | auction_won |
--   sale_accepted | completion_confirmed
--
-- Rollback (-- down):
--   DROP TRIGGER IF EXISTS guard_notifications_read_only ON public.notifications;
--   DROP FUNCTION IF EXISTS private.guard_notifications_read_only() CASCADE;
--   DROP TABLE IF EXISTS public.notifications CASCADE;
-- =============================================================================

-- ===========================================================================
-- TABLE: notifications
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind       text        NOT NULL,  -- see kinds above
  payload    jsonb       NOT NULL DEFAULT '{}',
  read       boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

-- ===========================================================================
-- INDEXES
-- ===========================================================================
CREATE INDEX IF NOT EXISTS notifications_user_id_idx         ON public.notifications (user_id);
-- Common query: unread notifications for a user, newest first
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, created_at DESC)
  WHERE read = false;

-- ===========================================================================
-- TRIGGER: guard client writes to immutable columns
-- Clients may only change the `read` column. All other columns are immutable
-- after INSERT (notifications are append-only except for read-marking).
-- ===========================================================================
CREATE OR REPLACE FUNCTION private.guard_notifications_read_only()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  IF current_user = 'postgres' OR current_user = 'supabase_admin' THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id    IS DISTINCT FROM OLD.user_id    THEN
    RAISE EXCEPTION 'notifications.user_id is immutable';
  END IF;
  IF NEW.kind       IS DISTINCT FROM OLD.kind       THEN
    RAISE EXCEPTION 'notifications.kind is immutable';
  END IF;
  IF NEW.payload    IS DISTINCT FROM OLD.payload    THEN
    RAISE EXCEPTION 'notifications.payload is immutable';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'notifications.created_at is immutable';
  END IF;
  -- Only `read` may change — no exception raised for that.

  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_notifications_read_only
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_notifications_read_only();

-- ===========================================================================
-- RLS
-- ===========================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Own SELECT: user can read their own notifications
CREATE POLICY "notifications_own_read"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Own UPDATE: only for the `read` column; guard trigger enforces column restriction
CREATE POLICY "notifications_own_update"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING     (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- NOTE: No INSERT policy for authenticated role.
-- INSERT is handled by DB triggers and Edge Functions (service role).
-- Deny-by-default is correct for Phase 2.
