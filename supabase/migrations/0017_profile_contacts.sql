-- =============================================================================
-- Migration: 0017_profile_contacts.sql
-- Purpose:   Move whatsapp_phone out of public.profiles into its own table
--            (public.profile_contacts) with RLS that enforces column-level
--            phone visibility at the DB layer — not just by convention.
--
-- Why (closes verify finding W2):
--   Postgres RLS is row-level, not column-level.  The profiles_read_others
--   policy grants full-row visibility to in-scope non-blocked users.  That
--   means any SELECT * FROM profiles returns whatsapp_phone to anyone who can
--   see that profile row — not just accepted-transaction counterparties.
--   CLAUDE.md §3.5 requires the phone be revealed ONLY to a counterparty after
--   they accept a request.  Splitting the phone into profile_contacts with its
--   own RLS makes the DB the sole enforcer (not the convention "never query
--   profiles.whatsapp_phone directly").
--
-- What this migration does (in order):
--   1. CREATE TABLE public.profile_contacts  (RLS + policies + trigger)
--   2. INSERT existing phone data (idempotent — no real profiles yet)
--   3. ALTER TABLE public.profiles DROP COLUMN whatsapp_phone
--   4. DROP VIEW public.contact_info  (was SECURITY BARRIER + SECURITY DEFINER)
--   5. CREATE VIEW public.contact_info  (now a plain view over profile_contacts;
--      inherits table RLS — no longer needs SECURITY DEFINER; removes advisor
--      warning)
--
-- Rollback strategy (destructive — data in profile_contacts is lost):
--   DROP VIEW public.contact_info;
--   ALTER TABLE public.profiles ADD COLUMN whatsapp_phone text
--     CHECK (whatsapp_phone ~ '^\+[1-9]\d{6,14}$');
--   UPDATE public.profiles p SET whatsapp_phone = pc.whatsapp_phone
--     FROM public.profile_contacts pc WHERE pc.user_id = p.id;
--   DROP TABLE public.profile_contacts;
--   Recreate the old contact_info SECURITY BARRIER view from 0011.
--
-- Deps:  0004 (profiles, set_updated_at), 0010 (transactions,
--        private.has_accepted_transaction), 0011 (contact_info)
-- Phase: 2 – Data Model & Security Core (security fix / W2 close)
-- =============================================================================

-- ===========================================================================
-- 1. TABLE: profile_contacts
--    Owns the whatsapp_phone with proper per-column RLS via table isolation.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.profile_contacts (
  user_id        uuid        NOT NULL
                   PRIMARY KEY
                   REFERENCES public.profiles(id) ON DELETE CASCADE,
  whatsapp_phone text        NOT NULL
                   CHECK (whatsapp_phone ~ '^\+[1-9]\d{6,14}$'),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Index: user_id is the PK — already covered by the primary key btree index.
-- No additional index needed.

-- ---------------------------------------------------------------------------
-- TRIGGER: updated_at via moddatetime (matches pattern in 0004)
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_profile_contacts_updated_at
  BEFORE UPDATE ON public.profile_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ===========================================================================
-- 2. RLS: profile_contacts
--    Deny-by-default; two permissive SELECT policies combine with OR semantics:
--      - owner can always see / manage their own row
--      - counterparty with an accepted transaction can SELECT (read-only)
--    Guests (private.is_guest()) can never have an accepted transaction
--    (transactions require a real profile), so they are implicitly excluded
--    from the counterparty policy.  We add NOT private.is_guest() explicitly
--    for defense-in-depth, consistent with how profiles_read_others handles it.
-- ===========================================================================

ALTER TABLE public.profile_contacts ENABLE ROW LEVEL SECURITY;

-- Owner: full control over their own row
CREATE POLICY "profile_contacts_owner_select"
  ON public.profile_contacts
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "profile_contacts_owner_insert"
  ON public.profile_contacts
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "profile_contacts_owner_update"
  ON public.profile_contacts
  FOR UPDATE
  TO authenticated
  USING     ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "profile_contacts_owner_delete"
  ON public.profile_contacts
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Counterparty read: only after an accepted transaction exists between the
-- viewer and the phone's owner.  Guests are explicitly excluded
-- (defense-in-depth — they cannot have accepted transactions anyway).
CREATE POLICY "profile_contacts_counterparty_select"
  ON public.profile_contacts
  FOR SELECT
  TO authenticated
  USING (
    NOT private.is_guest()
    AND private.has_accepted_transaction((SELECT auth.uid()), user_id)
  );

-- ===========================================================================
-- 3. Drop the old SECURITY DEFINER / SECURITY BARRIER contact_info view FIRST
--    (must happen before DROP COLUMN because contact_info depends on
--    profiles.whatsapp_phone — PostgreSQL rejects the DROP COLUMN otherwise).
--    Can't use CREATE OR REPLACE to switch SECURITY DEFINER off; must drop and
--    recreate so the new view picks up the plain/security-invoker default.
-- ===========================================================================

DROP VIEW IF EXISTS public.contact_info;

-- ===========================================================================
-- 4. Migrate existing phone data (idempotent)
--    No real user profiles exist yet, but this is correct for future replays
--    and any dev environment that might have seed profiles.
-- ===========================================================================

INSERT INTO public.profile_contacts (user_id, whatsapp_phone)
SELECT id, whatsapp_phone
FROM public.profiles
WHERE whatsapp_phone IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- ===========================================================================
-- 5. Remove whatsapp_phone from profiles
--    This also drops the E.164 CHECK constraint that lived on profiles.
--    The check is now on profile_contacts.whatsapp_phone.
-- ===========================================================================

ALTER TABLE public.profiles DROP COLUMN IF EXISTS whatsapp_phone;

-- ===========================================================================
-- 5b. Recreate contact_info as a plain view over profile_contacts
--     No SECURITY DEFINER, no security_barrier: the underlying table's RLS
--     does the gating.  This removes the advisor's SECURITY DEFINER warning
--     for contact_info (only matches + cromo_with_country_rarity remain).
--
--     The view is a thin convenience alias so callers keep the stable name
--     contact_info instead of querying profile_contacts directly.
--     Reads the exact same columns as before: user_id, whatsapp_phone.
-- ===========================================================================

CREATE VIEW public.contact_info AS
  SELECT user_id, whatsapp_phone
  FROM public.profile_contacts;

-- Permissions: deny anon; grant SELECT to authenticated.
-- (Authenticated users still need the view to exist with their permissions;
--  the per-row gating is now fully handled by profile_contacts RLS.)
REVOKE ALL ON public.contact_info FROM public;
REVOKE ALL ON public.contact_info FROM anon;
GRANT SELECT ON public.contact_info TO authenticated;

-- Set security_invoker = true so the view runs with the QUERYING user's
-- privileges (not the view owner's).  Combined with profile_contacts RLS,
-- this fully removes the need for SECURITY DEFINER semantics and eliminates
-- the Supabase security advisor warning for contact_info.
-- PG15+ supports ALTER VIEW ... SET (security_invoker = true).
ALTER VIEW public.contact_info SET (security_invoker = true);
