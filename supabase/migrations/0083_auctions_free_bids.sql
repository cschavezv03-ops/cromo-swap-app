-- ============================================================================
-- 0083_auctions_free_bids
--
-- Decisión de producto: las subastas aceptan CUALQUIER bid superior al actual
-- por al menos $0.01 (sin obligar a un increment fijo del seller). El campo
-- `bid_increment` queda en la tabla por compatibilidad pero el RPC lo ignora.
-- El UI del cliente NO pide más este campo al crear subasta.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_place_bid(p_listing_id uuid, p_amount numeric)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  v_caller  uuid := (SELECT auth.uid());
  v_listing public.listings%ROWTYPE;
  v_blocked timestamptz;
  v_min     numeric;
  v_bid_id  uuid;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'invalid_input'; END IF;

  SELECT * INTO v_listing FROM public.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_listing.kind <> 'auction' THEN RAISE EXCEPTION 'not_an_auction'; END IF;
  IF v_listing.status <> 'active' THEN RAISE EXCEPTION 'not_available'; END IF;
  IF v_listing.ends_at IS NULL OR v_listing.ends_at <= now() THEN RAISE EXCEPTION 'auction_ended'; END IF;
  IF v_listing.seller_id = v_caller THEN RAISE EXCEPTION 'self_bid'; END IF;
  IF NOT private.listing_visible(p_listing_id) THEN RAISE EXCEPTION 'out_of_scope'; END IF;

  SELECT auction_blocked_until INTO v_blocked FROM public.profiles WHERE id = v_caller;
  IF v_blocked IS NOT NULL AND v_blocked > now() THEN RAISE EXCEPTION 'auction_blocked'; END IF;

  -- Bid libre: si no hay bids previos, debe igualar start_price; si hay bids
  -- previos, debe superar el current_bid en al menos $0.01.
  IF v_listing.bids_count = 0 THEN
    v_min := v_listing.start_price;
  ELSE
    v_min := COALESCE(v_listing.current_bid, v_listing.start_price) + 0.01;
  END IF;

  IF p_amount < v_min THEN RAISE EXCEPTION 'bid_too_low'; END IF;

  INSERT INTO public.auction_bids (listing_id, bidder_id, amount)
  VALUES (p_listing_id, v_caller, p_amount)
  RETURNING id INTO v_bid_id;

  UPDATE public.listings
     SET current_bid = p_amount,
         bids_count  = bids_count + 1
   WHERE id = p_listing_id;

  RETURN v_bid_id;
END;
$$;

-- Default del bid_increment a 0.01 (visible solo si alguien lee la fila — el
-- cliente ya no lo usa ni lo envía).
ALTER TABLE public.listings ALTER COLUMN bid_increment SET DEFAULT 0.01;
