-- Buy now: comprar inmediatamente una subasta al precio buy_now_price,
-- cerrando la subasta. Reserva el listing y crea transaction pending
-- de tipo auction_settlement para que el seller acepte.

CREATE OR REPLACE FUNCTION public.fn_buy_now_auction(p_listing_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  v_caller  uuid := auth.uid();
  v_listing public.listings%ROWTYPE;
  v_blocked timestamptz;
  v_tx_id   uuid;
  v_existing uuid;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_listing FROM public.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_listing.kind <> 'auction' THEN RAISE EXCEPTION 'not_an_auction'; END IF;
  IF v_listing.buy_now_price IS NULL THEN RAISE EXCEPTION 'no_buy_now'; END IF;
  IF v_listing.status <> 'active' THEN RAISE EXCEPTION 'not_available'; END IF;
  IF v_listing.ends_at IS NULL OR v_listing.ends_at <= now() THEN
    RAISE EXCEPTION 'auction_ended';
  END IF;
  IF v_listing.seller_id = v_caller THEN RAISE EXCEPTION 'self_buy'; END IF;
  IF NOT private.listing_visible(p_listing_id) THEN RAISE EXCEPTION 'out_of_scope'; END IF;

  -- Idempotencia: si ya hay una transaction settlement para este listing,
  -- la devolvemos (otro buy-now o auction-close ya pasó).
  SELECT id INTO v_existing
    FROM public.transactions
   WHERE listing_id = p_listing_id AND kind = 'auction_settlement'
   LIMIT 1;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  -- Ban check: buyer no puede comprar si está baneado de subastas.
  SELECT auction_blocked_until INTO v_blocked
    FROM public.profiles WHERE id = v_caller;
  IF v_blocked IS NOT NULL AND v_blocked > now() THEN
    RAISE EXCEPTION 'auction_blocked';
  END IF;

  INSERT INTO public.transactions (
    kind, listing_id, initiator_id, owner_id, status,
    final_price, currency, winning_bid_id
  ) VALUES (
    'auction_settlement', p_listing_id, v_caller, v_listing.seller_id,
    'pending', v_listing.buy_now_price, 'USD', NULL
  )
  RETURNING id INTO v_tx_id;

  INSERT INTO public.transaction_items (transaction_id, user_id, cromo_id, quantity, role)
  SELECT v_tx_id, v_listing.seller_id, li.cromo_id, li.quantity, 'auction_item'
    FROM public.listing_items li
   WHERE li.listing_id = p_listing_id;

  UPDATE public.listings SET status = 'reserved' WHERE id = p_listing_id;

  RETURN v_tx_id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.fn_buy_now_auction(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_buy_now_auction(uuid) TO authenticated;
