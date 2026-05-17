-- =============================================================================
-- Migration: 0041_admin_roles.sql
-- Purpose:   Admin role assignment table + private.is_admin() helper.
--            Backbone for the admin web panel: identifies which users have
--            administrative privileges and at what level. Used by Server
--            Actions on the admin panel for authorization checks AND by
--            audit_log to record the real actor behind every privileged op.
--
--            Roles:
--              - super_admin   : full control (users, catalog, moderation, all)
--              - moderator     : reports, bans, transaction reviews only
--              - content_admin : catalog editing only
--
--            INSERT/UPDATE/DELETE only by service-role (bypasses RLS by design).
--            SELECT policy lets a user check their own admin status.
--
-- Deps:      0004 (profiles), 0001 (private schema)
-- Phase:     9 – Admin Panel
--
-- Rollback (-- down):
--   DROP POLICY IF EXISTS "admin_roles_self_read" ON public.admin_roles;
--   DROP FUNCTION IF EXISTS private.is_admin(uuid) CASCADE;
--   DROP FUNCTION IF EXISTS private.has_admin_role(uuid, public.admin_role) CASCADE;
--   DROP TABLE IF EXISTS public.admin_roles CASCADE;
--   DROP TYPE IF EXISTS public.admin_role CASCADE;
-- =============================================================================

-- ===========================================================================
-- ENUM: admin_role
-- ===========================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
    CREATE TYPE public.admin_role AS ENUM ('super_admin', 'moderator', 'content_admin');
  END IF;
END$$;

-- ===========================================================================
-- TABLE: admin_roles
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.admin_roles (
  user_id    uuid              NOT NULL
               REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.admin_role NOT NULL,
  created_at timestamptz       NOT NULL DEFAULT now(),
  created_by uuid              NULL
               REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT admin_roles_pkey PRIMARY KEY (user_id)
);

CREATE INDEX IF NOT EXISTS admin_roles_role_idx ON public.admin_roles (role);

-- ===========================================================================
-- RLS
-- ===========================================================================
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- Self-read: any authenticated user can check IF they are admin (and what role).
-- INSERT/UPDATE/DELETE: no policies → only service-role can manage roles.
CREATE POLICY "admin_roles_self_read"
  ON public.admin_roles
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ===========================================================================
-- HELPER: private.is_admin(uuid)
-- Returns true iff the given user (default: current auth.uid()) has ANY role
-- in admin_roles. Used by RPC guards and (optionally) by RLS in the future.
-- ===========================================================================
CREATE OR REPLACE FUNCTION private.is_admin(p_user uuid DEFAULT NULL)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
DECLARE
  v_user uuid;
BEGIN
  v_user := coalesce(p_user, auth.uid());
  IF v_user IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.admin_roles WHERE user_id = v_user
  );
END;
$$;

REVOKE ALL ON FUNCTION private.is_admin(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin(uuid) TO authenticated;

-- ===========================================================================
-- HELPER: private.has_admin_role(uuid, admin_role)
-- Returns true iff the given user has EXACTLY the given role, OR is super_admin
-- (super_admin implicitly satisfies every lower-privileged role).
-- ===========================================================================
CREATE OR REPLACE FUNCTION private.has_admin_role(p_user uuid, p_role public.admin_role)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
DECLARE
  v_user uuid;
  v_actual public.admin_role;
BEGIN
  v_user := coalesce(p_user, auth.uid());
  IF v_user IS NULL THEN
    RETURN false;
  END IF;
  SELECT role INTO v_actual FROM public.admin_roles WHERE user_id = v_user;
  IF v_actual IS NULL THEN
    RETURN false;
  END IF;
  RETURN v_actual = p_role OR v_actual = 'super_admin'::public.admin_role;
END;
$$;

REVOKE ALL ON FUNCTION private.has_admin_role(uuid, public.admin_role) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.has_admin_role(uuid, public.admin_role) TO authenticated;
