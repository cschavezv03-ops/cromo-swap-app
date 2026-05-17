-- =============================================================================
-- Migration: 0058_audit_log.sql
-- Purpose:   Immutable audit log for every administrative action performed
--            via the admin panel. Each row records: who acted (actor_id +
--            denormalized actor_email), what action, on what target, and
--            the before/after JSON snapshots for diffing.
--
--            IMMUTABILITY: UPDATE and DELETE are blocked by triggers — once
--            written, an audit_log row is permanent. INSERT is also blocked
--            from client roles (no RLS policy + no GRANT). Only service-role
--            (or postgres directly) can write.
--
--            Append-only: there are no foreign keys to live data (actor_id
--            references auth.users with NO ACTION), so deleting a user does
--            not delete their audit trail. actor_email is denormalized so
--            the log remains readable even if the user is later removed.
--
-- Deps:      0001 (private schema), 0041 (admin_roles — actor must be admin)
-- Phase:     9 – Admin Panel
--
-- Rollback (-- down):
--   DROP TRIGGER IF EXISTS audit_log_no_delete ON public.audit_log;
--   DROP TRIGGER IF EXISTS audit_log_no_update ON public.audit_log;
--   DROP FUNCTION IF EXISTS private.audit_log_immutable() CASCADE;
--   DROP TABLE IF EXISTS public.audit_log CASCADE;
-- =============================================================================

-- ===========================================================================
-- TABLE: audit_log
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  actor_id     uuid        NULL
                 REFERENCES auth.users(id) ON DELETE NO ACTION,
  actor_email  text        NULL,
  actor_role   text        NULL,
  action       text        NOT NULL CHECK (char_length(action) BETWEEN 1 AND 100),
  target_type  text        NOT NULL CHECK (char_length(target_type) BETWEEN 1 AND 50),
  target_id    text        NULL,
  before_state jsonb       NULL,
  after_state  jsonb       NULL,
  metadata     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  ip_address   inet        NULL,
  user_agent   text        NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS audit_log_actor_idx        ON public.audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_target_idx       ON public.audit_log (target_type, target_id);
CREATE INDEX IF NOT EXISTS audit_log_action_idx       ON public.audit_log (action, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_created_idx      ON public.audit_log (created_at DESC);

-- ===========================================================================
-- RLS — no policies = no client access. Service-role bypasses RLS by design.
-- ===========================================================================
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ===========================================================================
-- IMMUTABILITY TRIGGERS
-- Even with service-role, UPDATE/DELETE on audit_log are blocked at the
-- database level. To actually remove rows you'd need to drop the trigger
-- first — a deliberate, recorded operation.
-- ===========================================================================
CREATE OR REPLACE FUNCTION private.audit_log_immutable()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log rows are immutable (operation: %)', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS audit_log_no_update ON public.audit_log;
CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON public.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION private.audit_log_immutable();

DROP TRIGGER IF EXISTS audit_log_no_delete ON public.audit_log;
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON public.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION private.audit_log_immutable();
