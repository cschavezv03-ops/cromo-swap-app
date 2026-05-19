-- ============================================================================
-- 0084_drop_admin_reports_bans
--
-- El módulo admin (otro agente) creó tablas reports y bans que no se usan
-- desde la app principal. Por decisión del usuario las eliminamos.
-- audit_log, admin_roles y broadcasts permanecen (pueden servir para
-- futuro panel admin).
-- ============================================================================

-- Borrar RPCs dependientes primero
DROP FUNCTION IF EXISTS public.fn_admin_ban_user(uuid, public.ban_scope, text, timestamptz) CASCADE;
DROP FUNCTION IF EXISTS public.fn_admin_lift_ban(uuid, text) CASCADE;

-- Tablas
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.bans CASCADE;

-- Enum type
DROP TYPE IF EXISTS public.ban_scope CASCADE;
