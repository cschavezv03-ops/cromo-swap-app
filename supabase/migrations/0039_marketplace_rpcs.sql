-- =============================================================================
-- Migration: 0039_marketplace_rpcs.sql
-- Purpose:   Add the auction-side RPCs the marketplace screens depend on.
--            Sale + package + purchase request RPCs already shipped in 0033.
--            This adds:
--              - fn_create_auction_listing
--              - fn_place_bid
--              - fn_close_auction (creates auction_settlement transaction)
--              - fn_pause_listing / fn_resume_listing (seller-only soft pause)
--            Plus: extend fn_cancel_transaction's side-effects so that a
--            buyer cancelling an auction_settlement they already triggered
--            sets `auction_blocked_until = now() + interval '14 days'` on
--            themselves (anti-abuse: winners that flake out get a 2-week ban).
--
-- Deps:      0007 (listings + private.listing_visible), 0009 (auction_bids),
--            0010 (transactions), 0033 (sales RPCs), 0035+.
--
-- Status mapping vs brief:
--   El brief mencionaba kinds y status para listings que NO existen en la
--   DB real (paused/sold/closed). Mantenemos los valores actuales del
--   CHECK constraint (active|reserved|completed|cancelled). "Pausar" en
--   UI = soft-flag via private.guard_listings_status — pero como el guard
--   no permite a clientes pasar de active a otro valor que no sea cancelled,
--   exponemos pause/resume vía RPC SECURITY DEFINER que cambia status
--   active <-> reserved (la app ya entiende `reserved` como "no comprable").
--   Esto evita una migración invasiva al CHECK constraint.
-- =============================================================================

-- ===========================================================================
-- fn_create_auction_listing
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.fn_create_auction_listing(
  p_cromo_id           uuid,
  p_start_price        numeric,
  p_duration_hours     integer,
  p_bid_increment      numeric DEFAULT 1,
  p_buy_now_price      numeric DEFAULT NULL,
  p_is_public          boolean DEFAULT true,
  p_scope_universities text[]  DEFAULT '{}'::text[],
  p_description        text    DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_caller   uuid := (SELECT auth.uid());
  v_owned    integer;
  v_blocked  timestamptz;
  v_scope    text[];
  v_listing  uuid;
  v_ends_at  timestamptz;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_start_price IS NULL OR p_start_price <= 0 THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;
  IF p_duration_hours IS NULL OR p_duration_hours < 1 OR p_duration_hours > 168 THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;
  IF p_bid_increment IS NULL OR p_bid_increment <= 0 THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;
  IF p_buy_now_price IS NOT NULL AND p_buy_now_price <= p_start_price THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;

  -- Ban check (sellers can't auction while banned for non-completion).
  SELECT auction_blocked_until INTO v_blocked
    FROM public.profiles WHERE id = v_caller;
  IF v_blocked IS NOT NULL AND v_blocked > now() THEN
    RAISE EXCEPTION 'auction_blocked';
  END IF;

  -- Must own at least 1 copy of the cromo.
  SELECT owned_quantity INTO v_owned
    FROM public.inventory_items
   WHERE user_id = v_caller AND cromo_id = p_cromo_id
   FOR UPDATE;
  IF NOT FOUND OR v_owned < 1 THEN
    RAISE EXCEPTION 'not_owned';
  END IF;

  v_scope := COALESCE(p_scope_universities, ARRAY[]::text[]);
  IF NOT COALESCE(p_is_public, true) AND coalesce(cardinality(v_scope), 0) = 0 THEN
    SELECT ARRAY[university]::text[] INTO v_scope
      FROM public.profiles WHERE id = v_caller;
    IF v_scope IS NULL OR v_scope[1] IS NULL THEN
      RAISE EXCEPTION 'invalid_input';
    END IF;
  END IF;

  v_ends_at := now() + (p_duration_hours || ' hours')::interval;

  INSERT INTO public.listings (
    seller_id, kind, status, is_public, scope_universities,
    start_price, current_bid, bid_increment, buy_now_price,
    ends_at, bids_count, description
  ) VALUES (
    v_caller, 'auction', 'active',
    COALESCE(p_is_public, true), v_scope,
    p_start_price, p_start_price, p_bid_increment, p_buy_now_price,
    v_ends_at, 0, p_description
  )
  RETURNING id INTO v_listing;

  INSERT INTO public.listing_items (listing_id, cromo_id, quantity)
  VALUES (v_listing, p_cromo_id, 1);

  RETURN v_listing;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'cromo_already_listed' USING ERRCODE = 'unique_violation';
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_create_auction_listing(uuid, numeric, integer, numeric, numeric, boolean, text[], text) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.fn_create_auction_listing(uuid, numeric, integer, numeric, numeric, boolean, text[], text) TO authenticated;


-- ===========================================================================
-- fn_place_bid
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.fn_place_bid(
  p_listing_id uuid,
  p_amount     numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_caller   uuid := (SELECT auth.uid());
  v_listing  public.listings%ROWTYPE;
  v_blocked  timestamptz;
  v_min      numeric;
  v_bid_id   uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;

  SELECT * INTO v_listing FROM public.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  IF v_listing.kind <> 'auction' THEN
    RAISE EXCEPTION 'not_an_auction';
  END IF;
  IF v_listing.status <> 'active' THEN
    RAISE EXCEPTION 'not_available';
  END IF;
  IF v_listing.ends_at IS NULL OR v_listing.ends_at <= now() THEN
    RAISE EXCEPTION 'auction_ended';
  END IF;
  IF v_listing.seller_id = v_caller THEN
    RAISE EXCEPTION 'self_bid';
  END IF;
  IF NOT private.listing_visible(p_listing_id) THEN
    RAISE EXCEPTION 'out_of_scope';
  END IF;

  -- Ban check on bidder.
  SELECT auction_blocked_until INTO v_blocked
    FROM public.profiles WHERE id = v_caller;
  IF v_blocked IS NOT NULL AND v_blocked > now() THEN
    RAISE EXCEPTION 'auction_blocked';
  END IF;

  v_min := COALESCE(v_listing.current_bid, v_listing.start_price)
           + COALESCE(v_listing.bid_increment, 1);
  -- El primer bid puede igualar al start_price (no hay current_bid previo).
  IF v_listing.bids_count = 0 THEN
    v_min := v_listing.start_price;
  END IF;

  IF p_amount < v_min THEN
    RAISE EXCEPTION 'bid_too_low';
  END IF;

  INSERT INTO public.auction_bids (listing_id, bidder_id, amount)
  VALUES (p_listing_id, v_caller, p_amount)
  RETURNING id INTO v_bid_id;

  UPDATE public.listings
     SET current_bid = p_amount,
         bids_count  = bids_count + 1
   WHERE id = p_listing_id;

  RETURN v_bid_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_place_bid(uuid, numeric) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.fn_place_bid(uuid, numeric) TO authenticated;


-- ===========================================================================
-- fn_close_auction
-- Cierra una subasta vencida y crea la transacción auction_settlement con
-- el bidder ganador. Idempotente: si ya existe la transaction asociada,
-- la devuelve. Cualquiera puede llamarla (lo hace el cliente que ve
-- ends_at < now()); el servidor valida.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.fn_close_auction(p_listing_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_caller   uuid := (SELECT auth.uid());
  v_listing  public.listings%ROWTYPE;
  v_top      public.auction_bids%ROWTYPE;
  v_existing uuid;
  v_tx_id    uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_listing FROM public.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  IF v_listing.kind <> 'auction' THEN
    RAISE EXCEPTION 'not_an_auction';
  END IF;
  IF v_listing.ends_at IS NULL OR v_listing.ends_at > now() THEN
    RAISE EXCEPTION 'auction_not_ended';
  END IF;

  -- Idempotencia: ya hay una transaction asociada → devolverla.
  SELECT id INTO v_existing
    FROM public.transactions
   WHERE listing_id = p_listing_id AND kind = 'auction_settlement'
   LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- Sin bids → cerramos la subasta sin ganador (status='cancelled').
  SELECT * INTO v_top FROM public.auction_bids
   WHERE listing_id = p_listing_id
   ORDER BY amount DESC, created_at ASC
   LIMIT 1;

  IF NOT FOUND THEN
    UPDATE public.listings
       SET status = 'cancelled'
     WHERE id = p_listing_id AND status IN ('active','reserved');
    RETURN NULL;
  END IF;

  -- Crear la transacción de liquidación: initiator = ganador del bid,
  -- owner = vendedor. status = pending → el seller debe aceptar para
  -- liberar el contacto.
  INSERT INTO public.transactions (
    kind, listing_id, initiator_id, owner_id, status,
    final_price, currency, winning_bid_id
  ) VALUES (
    'auction_settlement', p_listing_id, v_top.bidder_id, v_listing.seller_id,
    'pending', v_top.amount, 'USD', v_top.id
  )
  RETURNING id INTO v_tx_id;

  INSERT INTO public.transaction_items (transaction_id, user_id, cromo_id, quantity, role)
  SELECT v_tx_id, v_listing.seller_id, li.cromo_id, li.quantity, 'auction_item'
    FROM public.listing_items li WHERE li.listing_id = p_listing_id;

  UPDATE public.listings
     SET status = 'reserved'
   WHERE id = p_listing_id;

  RETURN v_tx_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_close_auction(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.fn_close_auction(uuid) TO authenticated;


-- ===========================================================================
-- fn_pause_listing / fn_resume_listing
-- "Pausar" sin tocar el CHECK constraint: mueve active <-> reserved.
-- Solo el seller puede llamar. Solo aplica a listings sin transactions
-- pending/accepted (si hay, devuelve error).
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.fn_pause_listing(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_caller  uuid := (SELECT auth.uid());
  v_listing public.listings%ROWTYPE;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_listing FROM public.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_listing.seller_id <> v_caller THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF v_listing.status <> 'active' THEN RAISE EXCEPTION 'not_active'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.transactions
     WHERE listing_id = p_listing_id
       AND status IN ('pending','accepted')
  ) THEN
    RAISE EXCEPTION 'has_open_transactions';
  END IF;

  UPDATE public.listings SET status = 'reserved' WHERE id = p_listing_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_pause_listing(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.fn_pause_listing(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_resume_listing(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_caller  uuid := (SELECT auth.uid());
  v_listing public.listings%ROWTYPE;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_listing FROM public.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_listing.seller_id <> v_caller THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF v_listing.status <> 'reserved' THEN RAISE EXCEPTION 'not_paused'; END IF;
  -- Solo permitimos reanudar si NO hay subasta terminada / transactions abiertas.
  IF EXISTS (
    SELECT 1 FROM public.transactions
     WHERE listing_id = p_listing_id
       AND status IN ('pending','accepted')
  ) THEN
    RAISE EXCEPTION 'has_open_transactions';
  END IF;
  IF v_listing.kind = 'auction' AND v_listing.ends_at IS NOT NULL AND v_listing.ends_at <= now() THEN
    RAISE EXCEPTION 'auction_ended';
  END IF;

  UPDATE public.listings SET status = 'active' WHERE id = p_listing_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_resume_listing(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.fn_resume_listing(uuid) TO authenticated;


-- ===========================================================================
-- Extensión: aplicar ban de 14 días al ganador que cancela un
-- auction_settlement que ya estaba aceptado/pending. Se hace via
-- trigger AFTER UPDATE sobre transactions para no tener que reescribir
-- fn_cancel_transaction.
-- ===========================================================================
CREATE OR REPLACE FUNCTION private.apply_auction_ban_on_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.kind = 'auction_settlement'
     AND NEW.status = 'cancelled'
     AND OLD.status IN ('pending','accepted')
     AND NEW.cancelled_by IS NOT NULL
     AND NEW.cancelled_by = NEW.initiator_id THEN
    UPDATE public.profiles
       SET auction_blocked_until = now() + interval '14 days'
     WHERE id = NEW.initiator_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auction_ban_on_cancel ON public.transactions;
CREATE TRIGGER trg_auction_ban_on_cancel
  AFTER UPDATE OF status ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION private.apply_auction_ban_on_cancel();

REVOKE ALL ON FUNCTION private.apply_auction_ban_on_cancel() FROM public, anon, authenticated;
