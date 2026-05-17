-- =============================================================================
-- Migration: 0045_admin_rpcs.sql
-- Purpose:   SECURITY DEFINER RPCs that the admin panel can call as
--            authenticated (no service-role required). Every RPC guards on
--            private.is_admin() at the top — non-admins get a permission
--            error.
--
--            The admin panel primarily uses service-role server-side for
--            CRUD, but these RPCs encapsulate complex multi-step business
--            logic (force-closing an auction, reversing a transaction,
--            ban-with-side-effects) so the logic lives in ONE place,
--            transactionally, instead of being reimplemented in TypeScript.
--
--            Provided RPCs:
--              - fn_admin_force_close_auction(listing_id)
--                  closes an auction NOW (declares winner from top bid),
--                  ignoring ends_at. Creates auction_settlement transaction.
--              - fn_admin_force_cancel_listing(listing_id, reason)
--                  cancels any listing regardless of seller-only guards.
--              - fn_admin_ban_user(user_id, scope, reason, expires_at)
--                  inserts bans row + syncs profiles.auction_blocked_until
--                  for back-compat with the mobile client.
--              - fn_admin_lift_ban(ban_id, note)
--                  marks ban lifted; recalculates profiles.auction_blocked_until.
--
--            Every RPC writes an audit_log row.
--
-- Deps:      0007 (listings), 0009 (auction_bids), 0010 (transactions),
--            0041 (admin_roles + is_admin), 0043 (bans), 0044 (audit_log)
-- Phase:     9 – Admin Panel
--
-- Rollback (-- down):
--   DROP FUNCTION IF EXISTS public.fn_admin_lift_ban(uuid, text) CASCADE;
--   DROP FUNCTION IF EXISTS public.fn_admin_ban_user(uuid, public.ban_scope, text, timestamptz) CASCADE;
--   DROP FUNCTION IF EXISTS public.fn_admin_force_cancel_listing(uuid, text) CASCADE;
--   DROP FUNCTION IF EXISTS public.fn_admin_force_close_auction(uuid) CASCADE;
--   DROP FUNCTION IF EXISTS private.audit(text, text, text, jsonb, jsonb, jsonb) CASCADE;
-- =============================================================================

-- ===========================================================================
-- HELPER: private.audit(...) — internal helper used by every admin RPC
-- to write an audit_log row with the calling admin's identity. SECURITY
-- DEFINER so it can write to audit_log (which has no client INSERT policy).
-- ===========================================================================
CREATE OR REPLACE FUNCTION private.audit(
  p_action      text,
  p_target_type text,
  p_target_id   text,
  p_before      jsonb DEFAULT NULL,
  p_after       jsonb DEFAULT NULL,
  p_metadata    jsonb DEFAULT '{}'::jsonb
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
DECLARE
  v_actor      uuid;
  v_actor_email text;
  v_actor_role text;
  v_id         uuid;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NOT NULL THEN
    SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor;
    SELECT role::text INTO v_actor_role FROM public.admin_roles WHERE user_id = v_actor;
  END IF;

  INSERT INTO public.audit_log (
    actor_id, actor_email, actor_role,
    action, target_type, target_id,
    before_state, after_state, metadata
  ) VALUES (
    v_actor, v_actor_email, v_actor_role,
    p_action, p_target_type, p_target_id,
    p_before, p_after, coalesce(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION private.audit(text, text, text, jsonb, jsonb, jsonb) FROM public, anon, authenticated;
-- Not granted to authenticated — only callable from other SECURITY DEFINER functions.

-- ===========================================================================
-- RPC: fn_admin_force_close_auction(listing_id)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.fn_admin_force_close_auction(p_listing_id uuid)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
DECLARE
  v_listing  public.listings%ROWTYPE;
  v_top_bid  public.auction_bids%ROWTYPE;
  v_tx_id    uuid;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_listing FROM public.listings WHERE id = p_listing_id FOR UPDATE;
  IF v_listing.id IS NULL THEN
    RAISE EXCEPTION 'listing not found';
  END IF;
  IF v_listing.kind <> 'auction' THEN
    RAISE EXCEPTION 'listing is not an auction';
  END IF;
  IF v_listing.status NOT IN ('active', 'reserved') THEN
    RAISE EXCEPTION 'auction not closable in status %', v_listing.status;
  END IF;

  -- Pick top bid (highest amount, earliest tie-breaker)
  SELECT * INTO v_top_bid
  FROM public.auction_bids
  WHERE listing_id = p_listing_id
  ORDER BY amount DESC, created_at ASC
  LIMIT 1;

  IF v_top_bid.id IS NULL THEN
    -- No bids: cancel the listing.
    UPDATE public.listings SET status = 'cancelled' WHERE id = p_listing_id;
    PERFORM private.audit(
      'auction.force_close_no_bids', 'listing', p_listing_id::text,
      to_jsonb(v_listing), NULL, '{}'::jsonb
    );
    RETURN NULL;
  END IF;

  -- Create auction_settlement transaction.
  INSERT INTO public.transactions (
    kind, listing_id, initiator_id, owner_id, status,
    final_price, winning_bid_id, currency
  ) VALUES (
    'auction_settlement', p_listing_id, v_top_bid.bidder_id, v_listing.seller_id, 'pending',
    v_top_bid.amount, v_top_bid.id, 'USD'
  )
  RETURNING id INTO v_tx_id;

  UPDATE public.listings SET status = 'reserved' WHERE id = p_listing_id;

  PERFORM private.audit(
    'auction.force_close', 'listing', p_listing_id::text,
    to_jsonb(v_listing),
    jsonb_build_object('transaction_id', v_tx_id, 'winner_id', v_top_bid.bidder_id, 'final_price', v_top_bid.amount),
    '{}'::jsonb
  );

  RETURN v_tx_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_admin_force_close_auction(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fn_admin_force_close_auction(uuid) TO authenticated;

-- ===========================================================================
-- RPC: fn_admin_force_cancel_listing(listing_id, reason)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.fn_admin_force_cancel_listing(p_listing_id uuid, p_reason text)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
DECLARE
  v_before public.listings%ROWTYPE;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_before FROM public.listings WHERE id = p_listing_id FOR UPDATE;
  IF v_before.id IS NULL THEN
    RAISE EXCEPTION 'listing not found';
  END IF;
  IF v_before.status = 'cancelled' THEN
    RETURN;
  END IF;

  -- Bypass guard_listings_status: current_user inside SECURITY DEFINER (owned by
  -- postgres) is 'postgres', which the existing guard treats as service-role.
  UPDATE public.listings SET status = 'cancelled' WHERE id = p_listing_id;

  PERFORM private.audit(
    'listing.force_cancel', 'listing', p_listing_id::text,
    to_jsonb(v_before),
    (SELECT to_jsonb(l) FROM public.listings l WHERE id = p_listing_id),
    jsonb_build_object('reason', p_reason)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_admin_force_cancel_listing(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fn_admin_force_cancel_listing(uuid, text) TO authenticated;

-- ===========================================================================
-- RPC: fn_admin_ban_user(user_id, scope, reason, expires_at)
-- Inserts a bans row and, for compat, mirrors auction bans into
-- profiles.auction_blocked_until so the mobile client keeps respecting it.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.fn_admin_ban_user(
  p_user       uuid,
  p_scope      public.ban_scope,
  p_reason     text,
  p_expires_at timestamptz DEFAULT NULL
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
DECLARE
  v_actor uuid;
  v_id    uuid;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_actor := auth.uid();

  INSERT INTO public.bans (user_id, scope, reason, banned_by, expires_at)
  VALUES (p_user, p_scope, p_reason, v_actor, p_expires_at)
  RETURNING id INTO v_id;

  -- Compat: mirror auction/all bans into profiles.auction_blocked_until
  IF p_scope IN ('auction'::public.ban_scope, 'all'::public.ban_scope) THEN
    UPDATE public.profiles
      SET auction_blocked_until = coalesce(p_expires_at, 'infinity'::timestamptz)
      WHERE id = p_user;
  END IF;

  PERFORM private.audit(
    'user.ban', 'user', p_user::text,
    NULL,
    jsonb_build_object('ban_id', v_id, 'scope', p_scope, 'expires_at', p_expires_at),
    jsonb_build_object('reason', p_reason)
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_admin_ban_user(uuid, public.ban_scope, text, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fn_admin_ban_user(uuid, public.ban_scope, text, timestamptz) TO authenticated;

-- ===========================================================================
-- RPC: fn_admin_lift_ban(ban_id, note)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.fn_admin_lift_ban(p_ban_id uuid, p_note text DEFAULT NULL)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
DECLARE
  v_before public.bans%ROWTYPE;
  v_actor  uuid;
  v_max    timestamptz;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_actor := auth.uid();

  SELECT * INTO v_before FROM public.bans WHERE id = p_ban_id FOR UPDATE;
  IF v_before.id IS NULL THEN
    RAISE EXCEPTION 'ban not found';
  END IF;
  IF v_before.lifted_at IS NOT NULL THEN
    RETURN;
  END IF;

  UPDATE public.bans
    SET lifted_at = now(),
        lifted_by = v_actor,
        lifted_note = p_note
    WHERE id = p_ban_id;

  -- If lifted ban was auction/all, recompute the highest remaining active expiry
  -- so profiles.auction_blocked_until reflects the strongest remaining ban (if any).
  IF v_before.scope IN ('auction'::public.ban_scope, 'all'::public.ban_scope) THEN
    SELECT max(coalesce(expires_at, 'infinity'::timestamptz))
      INTO v_max
      FROM public.bans
      WHERE user_id = v_before.user_id
        AND scope IN ('auction'::public.ban_scope, 'all'::public.ban_scope)
        AND lifted_at IS NULL
        AND (expires_at IS NULL OR expires_at > now());
    UPDATE public.profiles
      SET auction_blocked_until = v_max
      WHERE id = v_before.user_id;
  END IF;

  PERFORM private.audit(
    'user.ban_lift', 'ban', p_ban_id::text,
    to_jsonb(v_before),
    (SELECT to_jsonb(b) FROM public.bans b WHERE id = p_ban_id),
    jsonb_build_object('note', p_note)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_admin_lift_ban(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fn_admin_lift_ban(uuid, text) TO authenticated;
