-- =============================================================================
-- Migration: 0062_admin_views_lockdown.sql
-- Purpose:   Revoke SELECT on admin materialized views from anon/authenticated.
--            The panel reads them via service-role server-side; clients never
--            need direct access. Plus mv_admin_daily_signups reads auth.users
--            so exposing it via PostgREST would leak signup info.
--
-- Deps:      0060_admin_views, 0058_audit_log, 0061_broadcasts
-- Phase:     9 – Admin Panel (hardening)
-- =============================================================================

REVOKE SELECT ON public.mv_admin_daily_gmv FROM anon, authenticated;
REVOKE SELECT ON public.mv_admin_daily_signups FROM anon, authenticated;

COMMENT ON TABLE public.audit_log IS
  'Immutable admin audit log. RLS enabled with no policies by design — only service-role writes (admin panel server-side) and reads.';
COMMENT ON TABLE public.broadcasts IS
  'Admin broadcast metadata. RLS enabled with no policies by design — service-role only.';
