-- =============================================================================
-- Migration: 0010_transactions.sql
-- Purpose:   Create transactions table; BEFORE UPDATE guard trigger (status
--            changes denied for client); moddatetime trigger; RLS (parties
--            SELECT only; no client INSERT/UPDATE — service role only via
--            Edge Fns Phase 5).
-- Deps:      0007 (listings), 0004 (profiles, private.has_accepted_transaction)
-- Phase:     2 – Data Model & Security Core
--
-- NOTE: private.has_accepted_transaction (created in 0004) references this
--       table. That function was created with a deferred PL/pgSQL body —
--       now that this table exists the function resolves correctly on first call.
--       No ALTER is needed here (see 0004 comment for rationale).
--
-- NOTE: No INSERT policy for client roles is intentional. Transactions are
--       created atomically by Edge Functions (accept_transaction, Phase 5)
--       using the service role after validating the listing is available and
--       locking it with SELECT FOR UPDATE. A client cannot INSERT directly.
--
-- Rollback (-- down):
--   DROP TRIGGER IF EXISTS guard_transactions_status ON public.transactions;
--   DROP FUNCTION IF EXISTS private.guard_transactions_status() CASCADE;
--   DROP TRIGGER IF EXISTS set_transactions_updated_at ON public.transactions;
--   DROP TABLE IF EXISTS public.transactions CASCADE;
-- =============================================================================

-- ===========================================================================
-- TABLE: transactions
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id                  uuid          NOT NULL DEFAULT gen_random_uuid(),
  kind                text          NOT NULL
                        CHECK (kind IN ('trade','sale','auction_settlement')),
  listing_id          uuid          NOT NULL
                        REFERENCES public.listings(id)  ON DELETE RESTRICT,
  initiator_id        uuid          NOT NULL
                        REFERENCES public.profiles(id)  ON DELETE CASCADE,
  owner_id            uuid          NOT NULL
                        REFERENCES public.profiles(id)  ON DELETE CASCADE,
  status              text          NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','accepted','completed','cancelled')),
  offered_cromo_id    uuid          NULL
                        REFERENCES public.catalog_cromos(id) ON DELETE RESTRICT,
  initiator_confirmed boolean       NOT NULL DEFAULT false,
  owner_confirmed     boolean       NOT NULL DEFAULT false,
  cancellation_reason text          NULL,
  cancelled_at        timestamptz   NULL,
  completed_at        timestamptz   NULL,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT transactions_pkey PRIMARY KEY (id)
);

-- ===========================================================================
-- INDEXES
-- ===========================================================================
CREATE INDEX IF NOT EXISTS transactions_initiator_id_idx ON public.transactions (initiator_id);
CREATE INDEX IF NOT EXISTS transactions_owner_id_idx     ON public.transactions (owner_id);
CREATE INDEX IF NOT EXISTS transactions_listing_id_idx   ON public.transactions (listing_id);
CREATE INDEX IF NOT EXISTS transactions_status_idx       ON public.transactions (status);

-- ===========================================================================
-- TRIGGER: updated_at
-- ===========================================================================
CREATE TRIGGER set_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ===========================================================================
-- TRIGGER: guard status changes from client
-- All status transitions are Edge-Function-controlled (Phase 5+).
-- Client may NOT change status, offered_cromo_id, initiator_id, owner_id,
-- or listing_id directly.
-- ===========================================================================
CREATE OR REPLACE FUNCTION private.guard_transactions_status()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  IF current_user = 'postgres' OR current_user = 'supabase_admin' THEN
    RETURN NEW;
  END IF;

  -- Block any status change from client
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION
      'transactions.status transitions are Edge-Function-controlled (Phase 5); '
      'clients cannot change status directly';
  END IF;

  -- Block structural changes
  IF NEW.initiator_id IS DISTINCT FROM OLD.initiator_id
  OR NEW.owner_id     IS DISTINCT FROM OLD.owner_id
  OR NEW.listing_id   IS DISTINCT FROM OLD.listing_id THEN
    RAISE EXCEPTION
      'transactions structural fields (initiator_id, owner_id, listing_id) '
      'are immutable from client context';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_transactions_status
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_transactions_status();

-- ===========================================================================
-- RLS
-- ===========================================================================
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Parties (initiator or owner) can SELECT their transactions.
-- Third parties see nothing.
CREATE POLICY "transactions_parties_read"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) IN (initiator_id, owner_id)
  );

-- NOTE: No INSERT or UPDATE policy for authenticated role.
-- All writes go through Edge Functions (service role) in Phase 5.
-- Deny-by-default is correct for Phase 2.
