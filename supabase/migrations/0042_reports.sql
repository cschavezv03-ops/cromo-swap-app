-- =============================================================================
-- Migration: 0042_reports.sql
-- Purpose:   User-submitted reports against users / listings / transactions /
--            cromos. Backbone of the moderation queue exposed in the admin
--            panel. Reporter can create + read their own reports; admins
--            access everything via service-role (server-side).
--
-- Deps:      0004 (profiles), 0001 (set_updated_at)
-- Phase:     9 – Admin Panel
--
-- Rollback (-- down):
--   DROP POLICY IF EXISTS "reports_own_read"   ON public.reports;
--   DROP POLICY IF EXISTS "reports_own_insert" ON public.reports;
--   DROP TRIGGER IF EXISTS set_reports_updated_at ON public.reports;
--   DROP TABLE IF EXISTS public.reports CASCADE;
--   DROP TYPE IF EXISTS public.report_status CASCADE;
--   DROP TYPE IF EXISTS public.report_target CASCADE;
-- =============================================================================

-- ===========================================================================
-- ENUMs
-- ===========================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_target') THEN
    CREATE TYPE public.report_target AS ENUM ('user', 'listing', 'transaction', 'cromo');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
    CREATE TYPE public.report_status AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');
  END IF;
END$$;

-- ===========================================================================
-- TABLE: reports
-- target_id is uuid because all reportable entities use uuid PKs.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id              uuid                 NOT NULL DEFAULT gen_random_uuid(),
  reporter_id     uuid                 NOT NULL
                    REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type     public.report_target NOT NULL,
  target_id       uuid                 NOT NULL,
  reason          text                 NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 100),
  description     text                 NULL     CHECK (description IS NULL OR char_length(description) <= 2000),
  status          public.report_status NOT NULL DEFAULT 'open',
  resolved_by     uuid                 NULL
                    REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_note text                 NULL,
  resolved_at     timestamptz          NULL,
  created_at      timestamptz          NOT NULL DEFAULT now(),
  updated_at      timestamptz          NOT NULL DEFAULT now(),
  CONSTRAINT reports_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS reports_status_created_idx ON public.reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_target_idx          ON public.reports (target_type, target_id);
CREATE INDEX IF NOT EXISTS reports_reporter_idx        ON public.reports (reporter_id);
CREATE INDEX IF NOT EXISTS reports_resolved_by_idx     ON public.reports (resolved_by) WHERE resolved_by IS NOT NULL;

-- ===========================================================================
-- TRIGGER: updated_at
-- ===========================================================================
CREATE TRIGGER set_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ===========================================================================
-- RLS
-- ===========================================================================
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Reporter can create a report (only as themselves).
CREATE POLICY "reports_own_insert"
  ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = (SELECT auth.uid())
    AND NOT private.is_guest()
  );

-- Reporter can read their own reports.
CREATE POLICY "reports_own_read"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (reporter_id = (SELECT auth.uid()));

-- UPDATE / DELETE: no client policy. Admin operations happen server-side via
-- service-role. The admin panel writes resolution updates and dismissals
-- directly through the Server Actions layer.
