-- =============================================================================
-- Migration: 0001_extensions_private_schema.sql
-- Purpose:   Enable moddatetime extension; create private schema for SECURITY
--            DEFINER helpers; install set_updated_at() trigger function;
--            REVOKE access to private from public/anon/authenticated.
-- Deps:      none
-- Phase:     2 – Data Model & Security Core
-- Author:    sdd-apply (generated; human-approved before apply)
--
-- Rollback (-- down):
--   DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
--   REVOKE USAGE ON SCHEMA private FROM postgres;
--   DROP SCHEMA IF EXISTS private CASCADE;
--   DROP EXTENSION IF EXISTS moddatetime;
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extensions (stored in extensions schema, like Supabase default)
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;
-- citext: case-insensitive text type — used for email_domain in universities table
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;

-- ----------------------------------------------------------------------------
-- 2. private schema — accessible only to postgres / service role
--    Client roles (anon, authenticated) get NO USAGE grant.
-- ----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM public;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;

-- postgres (service role) retains full access — it's the schema owner.

-- ----------------------------------------------------------------------------
-- 3. Generic updated_at trigger function (lives in public so it's reachable by
--    triggers on public.* tables; calls the moddatetime function).
--
--    Usage:
--      CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.<table>
--        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Permissions: only postgres needs to use this as a trigger function.
-- Triggers fire under the table owner's context, so no GRANT to anon/authenticated.
REVOKE ALL ON FUNCTION public.set_updated_at() FROM public, anon, authenticated;
