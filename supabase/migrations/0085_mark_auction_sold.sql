-- ============================================================================
-- 0085_mark_auction_sold
--
-- Permite al seller marcar una subasta como VENDIDA antes del ends_at
-- cuando hay al menos un bid. Crea la transaction `auction_settlement`
-- igual que `fn_close_auction`, marca el listing como reserved, y notifica
-- al ganador. Si no hay bids, error.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_mark_auction_sold(p_listing_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_listing  public.listings%ROWTYPE;
  v_top      public.auction_bids%ROWTYPE;
  v_existing uuid;
  v_tx_id    uuid;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_listing FROM public.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_listing.kind <> 'auction' THEN RAISE EXCEPTION 'not_an_auction'; END IF;
  IF v_listing.seller_id <> v_caller THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF v_listing.status <> 'active' THEN RAISE EXCEPTION 'not_available'; END IF;

  -- Idempotencia: si ya hay una transaction settlement, devolverla.
  SELECT id INTO v_existing
    FROM public.transactions
   WHERE listing_id = p_listing_id AND kind = 'auction_settlement'
   LIMIT 1;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  -- Debe haber al menos un bid para vender
  SELECT * INTO v_top FROM public.auction_bids
   WHERE listing_id = p_listing_id
   ORDER BY amount DESC, created_at ASC
   LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'no_bids'; END IF;

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
    FROM public.listing_items li
   WHERE li.listing_id = p_listing_id;

  UPDATE public.listings
     SET status = 'reserved', ends_at = now()
   WHERE id = p_listing_id;

  RETURN v_tx_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_mark_auction_sold(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mark_auction_sold(uuid) TO authenticated;
