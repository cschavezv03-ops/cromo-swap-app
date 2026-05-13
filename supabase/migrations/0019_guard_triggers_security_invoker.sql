-- =============================================================================
-- Migration: 0019_guard_triggers_security_invoker.sql
-- Purpose:   Fix guard trigger functions — remove SECURITY DEFINER so that
--            current_user reflects the actual calling role.
--
-- Root cause (found by pgTAP run, phase-2-data-model W3):
--   Guard trigger functions were SECURITY DEFINER → inside the function,
--   current_user is always 'postgres' (the function owner), regardless of
--   the client's actual role. The guard check
--     IF current_user = 'postgres' … THEN RETURN NEW
--   always passed, meaning the guard NEVER fired for any caller — including
--   malicious clients. This is a security defect.
--
-- Fix: remove SECURITY DEFINER (functions become SECURITY INVOKER by default).
--   Inside a SECURITY INVOKER trigger, current_user == session role of caller.
--   The guard now correctly bypasses only when called from postgres/supabase_admin
--   (service-role / migration context) and raises for any client role.
--
-- Affected functions (all guard triggers; NOT the private.* helper functions
-- which DO need SECURITY DEFINER to access private schema objects):
--   private.guard_profiles_immutable_cols()
--   private.guard_listings_status()
--   private.guard_transactions_status()
--   private.guard_notifications_read_only()
-- =============================================================================

-- ---------------------------------------------------------------------------
-- private.guard_profiles_immutable_cols
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.guard_profiles_immutable_cols()
  RETURNS TRIGGER
  LANGUAGE plpgsql
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

-- ---------------------------------------------------------------------------
-- private.guard_listings_status
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.guard_listings_status()
  RETURNS TRIGGER
  LANGUAGE plpgsql
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

-- ---------------------------------------------------------------------------
-- private.guard_transactions_status
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.guard_transactions_status()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path = ''
AS $$
BEGIN
  IF current_user = 'postgres' OR current_user = 'supabase_admin' THEN
    RETURN NEW;
  END IF;

  -- Block any status change from client
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION
      'transactions.status transitions are Edge-Function-controlled (Phase 5); '
      'clients cannot change status directly';
  END IF;

  -- Block structural changes
  IF NEW.initiator_id IS DISTINCT FROM OLD.initiator_id
  OR NEW.owner_id     IS DISTINCT FROM OLD.owner_id
  OR NEW.listing_id   IS DISTINCT FROM OLD.listing_id THEN
    RAISE EXCEPTION
      'transactions structural fields (initiator_id, owner_id, listing_id) '
      'are immutable from client context';
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- private.guard_notifications_read_only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.guard_notifications_read_only()
  RETURNS TRIGGER
  LANGUAGE plpgsql
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
