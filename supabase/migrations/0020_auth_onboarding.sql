-- =============================================================================
-- Migration: 0020_auth_onboarding.sql
-- Purpose:   Phase 3 — Auth & Onboarding backend hooks and helpers.
--
--   Adds:
--     1. public.before_user_created_hook(event jsonb) → jsonb
--          "Before User Created" Postgres hook. Rejects signups whose email
--          domain is not in public.universities.email_domain (citext, case-
--          insensitive). Anonymous signups are always allowed (is_anonymous=true
--          in the event payload). Fails closed on any unexpected state.
--
--     2. private.handle_email_confirmed() + trigger on auth.users
--          AFTER INSERT OR UPDATE OF email_confirmed_at: derives the university
--          from the confirmed email and upserts public.profiles. Owned by
--          postgres (SECURITY DEFINER) so the 0019 guard trigger's service-role
--          bypass applies. Never raises an exception that would block auth flow.
--
--     3. private.handle_new_anonymous_user() + trigger on auth.users
--          AFTER INSERT WHEN (NEW.is_anonymous): provisions a guest profiles row
--          with is_anonymous=true. Never raises.
--
--     4. private.is_confirmed() → boolean
--          Returns true iff the current JWT indicates an email-confirmed session.
--          SECURITY DEFINER, STABLE, GRANT EXECUTE to authenticated.
--          Reserved for Phase-5 social RLS wiring — declared now for testability.
--
-- ⚠️  MANUAL DASHBOARD STEPS REQUIRED (see supabase/AUTH_SETUP.md):
--     • Auth → Hooks → Before User Created: enable, Postgres function,
--       function = public.before_user_created_hook
--     • Auth → Email: Confirm email = ON
--     • Auth → Anonymous sign-ins = ON
--     • Auth → Manual linking = ON
--   Until the hook is wired in the dashboard, this function exists but is not
--   invoked; all signups proceed normally (safe for incremental rollout).
--
-- Rollback (down):
--   DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
--   DROP TRIGGER IF EXISTS on_auth_user_created_anon ON auth.users;
--   DROP FUNCTION IF EXISTS private.handle_email_confirmed() CASCADE;
--   DROP FUNCTION IF EXISTS private.handle_new_anonymous_user() CASCADE;
--   DROP FUNCTION IF EXISTS private.is_confirmed() CASCADE;
--   DROP FUNCTION IF EXISTS public.before_user_created_hook(jsonb) CASCADE;
--   REVOKE USAGE ON SCHEMA public FROM supabase_auth_admin;  -- only if safe
--   (Also unwire the hook in the Supabase dashboard.)
--
-- Deps:      0004 (profiles), 0002 (universities with email_domain citext)
--            0019 (guard_profiles_immutable_cols — service-role bypass pattern)
-- Phase:     3 – Auth & Onboarding
-- =============================================================================

-- ===========================================================================
-- 1. public.before_user_created_hook(event jsonb) → jsonb
--    Supabase "Before User Created" hook: allow-list institutional email domains.
--
--    Event shape (confirmed from Supabase docs):
--      { "metadata": {...}, "user": { "email": "...", "is_anonymous": false, ... } }
--
--    Logic:
--      - Anonymous signups (is_anonymous=true): always allow → return '{}'
--      - Email is NULL or empty: treat as unrecognized → reject (fail closed)
--      - Domain matches universities.email_domain (citext): allow → return '{}'
--      - No match: reject with http_code 403
--
--    Security:
--      - SECURITY DEFINER (reads public.universities, no client-writable data)
--      - SET search_path = '' (no schema injection)
--      - REVOKE from public/anon/authenticated
--      - GRANT EXECUTE to supabase_auth_admin (required by Supabase hook engine)
--      - GRANT USAGE on schema public to supabase_auth_admin (for hook execution)
--      - NO PII (email, IP, etc.) in any returned error message or RAISE
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.before_user_created_hook(event jsonb)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
DECLARE
  v_is_anonymous boolean;
  v_email        text;
  v_domain       text;
BEGIN
  -- Extract fields from the hook event payload
  v_is_anonymous := coalesce((event -> 'user' ->> 'is_anonymous')::boolean, false);
  v_email        := event -> 'user' ->> 'email';

  -- Anonymous signups are always allowed — no email to check
  IF v_is_anonymous THEN
    RETURN '{}'::jsonb;
  END IF;

  -- Fail closed: missing or empty email on a non-anonymous signup is rejected
  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message',   'Registro permitido solo con un correo universitario reconocido.'
      )
    );
  END IF;

  -- Extract the domain part (lower-cased for citext comparison)
  v_domain := lower(split_part(v_email, '@', 2));

  -- Allow only domains present in the universities allow-list (citext = case-insensitive)
  IF EXISTS (
    SELECT 1
    FROM public.universities
    WHERE email_domain = v_domain::extensions.citext
  ) THEN
    RETURN '{}'::jsonb;
  END IF;

  -- Domain not recognized → reject; no PII in the message
  RETURN jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message',   'Registro permitido solo con un correo universitario reconocido.'
    )
  );

EXCEPTION WHEN OTHERS THEN
  -- Fail closed on any unexpected error — reject to protect the allow-list
  RETURN jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message',   'Registro permitido solo con un correo universitario reconocido.'
    )
  );
END;
$$;

-- Grant supabase_auth_admin access to execute the hook function
-- (Supabase may do this automatically when wired via the dashboard, but we
--  apply it explicitly in the migration for idempotency and local dev parity.)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.before_user_created_hook(jsonb) TO supabase_auth_admin;

-- Revoke from all other roles — hook must not be callable by clients
REVOKE EXECUTE ON FUNCTION public.before_user_created_hook(jsonb) FROM public, anon, authenticated;


-- ===========================================================================
-- 2. private.handle_email_confirmed() → trigger function
--    Derives the university from the confirmed email and upserts profiles.
--
--    Fires AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users.
--    Conditions checked in the trigger body (not in WHEN clause) so that we
--    can handle both INSERT (TG_OP='INSERT') and UPDATE cleanly.
--
--    Owned by postgres (SECURITY DEFINER) → current_user='postgres' inside →
--    the 0019 guard trigger's "IF current_user='postgres' THEN RETURN NEW"
--    bypass applies, allowing this function to SET university and is_anonymous
--    on profiles without the guard raising an error.
--
--    Never raises an exception that would block Supabase's auth flow.
--    Domain-only RAISE WARNING (no email/PII) used for unexpected state.
-- ===========================================================================
CREATE OR REPLACE FUNCTION private.handle_email_confirmed()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
DECLARE
  v_domain text;
  v_uni    text;
BEGIN
  -- Guard: only act when email_confirmed_at transitions from NULL → NOT NULL,
  -- or on a re-confirm after email change (OLD.email IS DISTINCT FROM NEW.email).
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
    AND (OLD.email_confirmed_at IS NOT DISTINCT FROM NEW.email_confirmed_at)
    AND (OLD.email IS NOT DISTINCT FROM NEW.email) THEN
    -- No meaningful change for our purposes
    RETURN NEW;
  END IF;

  -- Extract domain (lower-cased) from the confirmed email
  v_domain := lower(split_part(NEW.email, '@', 2));

  -- Look up the university for this domain (citext comparison = case-insensitive)
  BEGIN
    SELECT id INTO v_uni
    FROM public.universities
    WHERE email_domain = v_domain::extensions.citext
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    -- Lookup error: leave profiles untouched, log domain (NOT email) for debugging
    RAISE WARNING 'handle_email_confirmed: university lookup failed for domain %', v_domain;
    RETURN NEW;
  END;

  IF v_uni IS NULL THEN
    -- Domain not in universities: defensive — should not happen for registered users
    -- because the before_user_created_hook already blocked unrecognized domains.
    -- For the guest→registered upgrade path (updateUser), the hook does NOT fire,
    -- so this is the real enforcement point: leave profiles untouched (university=NULL,
    -- is_anonymous unchanged) — the user simply won't pass in_scope filters.
    RAISE WARNING 'handle_email_confirmed: unrecognized domain %, no profile update', v_domain;
    RETURN NEW;
  END IF;

  -- Upsert the profiles row: create or update with derived university + is_anonymous=false.
  -- display_name: use 'Usuario' as placeholder; the user sets a real name in onboarding.
  -- Do NOT derive from email local-part (PII).
  BEGIN
    INSERT INTO public.profiles (id, university, display_name, is_anonymous)
    VALUES (NEW.id, v_uni, 'Usuario', false)
    ON CONFLICT (id) DO UPDATE
      SET university   = EXCLUDED.university,
          is_anonymous = false;
  EXCEPTION WHEN OTHERS THEN
    -- Never block auth flow — log a warning (no PII) and continue
    RAISE WARNING 'handle_email_confirmed: profile upsert failed for domain %: %', v_domain, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Trigger: fires AFTER INSERT OR UPDATE OF email_confirmed_at on auth.users
-- FOR EACH ROW. Supabase already has internal triggers on auth.users; this
-- is additive (we do not replace or modify Supabase's own triggers).
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER INSERT OR UPDATE OF email_confirmed_at
  ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION private.handle_email_confirmed();


-- ===========================================================================
-- 3. private.handle_new_anonymous_user() → trigger function
--    Provisions a guest profiles row when an anonymous user is created.
--
--    Fires AFTER INSERT ON auth.users WHEN (NEW.is_anonymous IS TRUE).
--    SECURITY DEFINER owned by postgres → same guard-trigger bypass as above.
--    Never raises.
-- ===========================================================================
CREATE OR REPLACE FUNCTION private.handle_new_anonymous_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, display_name, is_anonymous)
    VALUES (NEW.id, 'Invitado', true)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Never block auth flow for anonymous sessions
    RAISE WARNING 'handle_new_anonymous_user: profile insert failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Trigger: fires AFTER INSERT on auth.users only for anonymous users
DROP TRIGGER IF EXISTS on_auth_user_created_anon ON auth.users;
CREATE TRIGGER on_auth_user_created_anon
  AFTER INSERT
  ON auth.users
  FOR EACH ROW
  WHEN (NEW.is_anonymous IS TRUE)
  EXECUTE FUNCTION private.handle_new_anonymous_user();


-- ===========================================================================
-- 4. private.is_confirmed() → boolean
--    Returns true iff the current JWT indicates an email-confirmed session.
--
--    Signal used: `auth.jwt() ->> 'email_confirmed_at'` is present and non-empty
--    AND the session role is 'authenticated' (not anonymous, not anon role).
--
--    Defaults false when the claim is absent (fail-closed). This is intentional:
--    an absent claim = not confirmed or not set yet = no access to social features.
--
--    Phase 5 will wire this into social RLS policies (e.g. profiles_read_others
--    will require is_confirmed()). Declared now so it is testable and documented.
--
--    SECURITY DEFINER, SET search_path='', STABLE.
--    GRANT EXECUTE to authenticated only.
-- ===========================================================================
CREATE OR REPLACE FUNCTION private.is_confirmed()
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  RETURN coalesce(
    -- email_confirmed_at claim present and non-empty in the JWT
    nullif(auth.jwt() ->> 'email_confirmed_at', '') IS NOT NULL
    -- AND the session is not anonymous
    AND NOT coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false),
    false
  );
END;
$$;

REVOKE ALL ON FUNCTION private.is_confirmed() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_confirmed() TO authenticated;
