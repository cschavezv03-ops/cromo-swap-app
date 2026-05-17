-- =============================================================================
-- Migration: 0061_broadcasts.sql
-- Purpose:   Broadcast metadata table for admin-sent mass notifications.
--            One row per broadcast; the actual notification rows live in
--            public.notifications. Used to:
--              - keep a history of broadcasts in the admin panel
--              - record the audience filter used (for re-running or auditing)
--              - record how many recipients each broadcast reached
--
--            INSERT is performed by the admin panel via service-role; there
--            is no client policy for write operations.
--
-- Deps:      0004 (profiles), 0012 (notifications)
-- Phase:     9 – Admin Panel
--
-- Rollback (-- down):
--   DROP TABLE IF EXISTS public.broadcasts CASCADE;
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.broadcasts (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  sent_by         uuid        NULL
                    REFERENCES public.profiles(id) ON DELETE SET NULL,
  audience_filter jsonb       NOT NULL,
  message_kind    text        NOT NULL CHECK (char_length(message_kind) BETWEEN 1 AND 100),
  message_payload jsonb       NOT NULL,
  recipient_count integer     NOT NULL DEFAULT 0 CHECK (recipient_count >= 0),
  note            text        NULL,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT broadcasts_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS broadcasts_sent_at_idx ON public.broadcasts (sent_at DESC);
CREATE INDEX IF NOT EXISTS broadcasts_sent_by_idx ON public.broadcasts (sent_by) WHERE sent_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS broadcasts_kind_idx    ON public.broadcasts (message_kind);

-- ===========================================================================
-- RLS — no client policies. Service-role only (admin panel writes / reads).
-- ===========================================================================
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
