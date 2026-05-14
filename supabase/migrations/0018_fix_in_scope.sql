-- =============================================================================
-- Migration: 0018_fix_in_scope.sql
-- Purpose:   Fix private.in_scope() — the original body used
--              target_university = ANY (SELECT scope FROM profiles WHERE id = viewer)
--            which compares text = text[] (type mismatch caught by pgTAP / local
--            Postgres strict type checking).  The correct form uses EXISTS with an
--            ANY(array-column) predicate.
-- Root-cause found: pgTAP W3 run (phase-2-data-model verify finding).
-- Affects:   private.in_scope — called by profiles_read_others policy and
--            the matches SECURITY DEFINER view.
-- No schema-level change; pure function replacement.
-- =============================================================================

CREATE OR REPLACE FUNCTION private.in_scope(viewer uuid, target_university text)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  RETURN (
    target_university IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = viewer
        AND target_university = ANY(scope)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION private.in_scope(uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.in_scope(uuid, text) TO authenticated;
