-- =============================================================================
-- Migration: 0011_contact_info_view.sql
-- Purpose:   Create contact_info SECURITY BARRIER view that exposes
--            whatsapp_phone ONLY when an accepted transaction exists between
--            the viewer and the target. This is the canonical and ONLY
--            mechanism by which a non-owner can access another user's phone.
-- Deps:      0004 (profiles, private.has_accepted_transaction), 0010 (transactions)
-- Phase:     2 – Data Model & Security Core
--
-- ⚠️  SUPERSEDED BY 0017_profile_contacts.sql (security fix — W2):
--   Migration 0017 moves whatsapp_phone from public.profiles into a separate
--   public.profile_contacts table with its own RLS (DB-enforced phone privacy,
--   not convention-only). It drops this view and recreates contact_info as a
--   plain security-invoker view over profile_contacts. The SQL statements in
--   THIS file (0011) are NOT to be modified — migrations are append-only.
--   See 0017 for the authoritative definition of contact_info and the phone
--   reveal mechanism.
--
-- Security model:
--   - View created with (security_barrier = true) to prevent predicate
--     push-down leaks.
--   - View executes with OWNER (postgres) rights by default in Postgres 15+
--     (security_invoker = false), so it can read whatsapp_phone even though
--     the caller's profile RLS wouldn't expose it to others.
--   - The WHERE clause is the sole gate: has_accepted_transaction must return true.
--   - REVOKE from anon; GRANT SELECT to authenticated.
--   - Client app MUST NEVER select whatsapp_phone from profiles directly.
--     This view is the only API surface.
--
-- Sequence (§4.5):
--   Transaction accepted → client queries contact_info WHERE user_id = seller →
--   1 row returned with whatsapp_phone → app shows "Contactar por WhatsApp" deeplink.
--   No accepted tx → 0 rows → phone never leaves the DB.
--
-- Rollback (-- down):
--   REVOKE SELECT ON public.contact_info FROM authenticated;
--   DROP VIEW IF EXISTS public.contact_info;
-- =============================================================================

CREATE OR REPLACE VIEW public.contact_info
  WITH (security_barrier = true)
AS
  SELECT
    p.id           AS user_id,
    p.whatsapp_phone
  FROM public.profiles p
  WHERE p.whatsapp_phone IS NOT NULL
    AND private.has_accepted_transaction((SELECT auth.uid()), p.id);

-- Deny access by default; only authenticated users with an accepted transaction
-- will get any rows (the WHERE clause is the real gate).
REVOKE ALL ON public.contact_info FROM public;
REVOKE ALL ON public.contact_info FROM anon;
GRANT SELECT ON public.contact_info TO authenticated;
