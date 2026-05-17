-- Ratings post-transacción (Sprint P0)
CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ratee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stars int NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text CHECK (comment IS NULL OR char_length(comment) <= 280),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ratings_unique_per_pair UNIQUE (transaction_id, rater_id),
  CONSTRAINT ratings_no_self CHECK (rater_id <> ratee_id)
);
CREATE INDEX ratings_ratee_idx ON public.ratings(ratee_id);
CREATE INDEX ratings_rater_idx ON public.ratings(rater_id);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY ratings_own_read ON public.ratings FOR SELECT
  TO authenticated
  USING (auth.uid() = rater_id OR auth.uid() = ratee_id);

CREATE POLICY ratings_read_others ON public.ratings FOR SELECT
  TO authenticated
  USING (
    auth.uid() <> ratee_id
    AND NOT private.is_guest()
    AND NOT private.is_blocked(auth.uid(), ratee_id)
    AND (
      private.is_friend(auth.uid(), ratee_id)
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = ratee_id
          AND (private.in_scope(auth.uid(), p.university)
            OR private.has_accepted_transaction(auth.uid(), ratee_id))
      )
    )
  );

CREATE OR REPLACE FUNCTION public.fn_create_rating(
  p_transaction_id uuid, p_stars int, p_comment text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_me uuid := auth.uid();
  v_tx public.transactions;
  v_ratee uuid;
  v_id uuid;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF p_stars < 1 OR p_stars > 5 THEN RAISE EXCEPTION 'invalid_stars' USING ERRCODE = '22023'; END IF;
  IF p_comment IS NOT NULL AND char_length(p_comment) > 280 THEN
    RAISE EXCEPTION 'comment_too_long' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_tx FROM public.transactions WHERE id = p_transaction_id;
  IF v_tx.id IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = '02000'; END IF;
  IF v_tx.status <> 'completed' THEN RAISE EXCEPTION 'not_completed' USING ERRCODE = '22023'; END IF;
  IF v_me = v_tx.initiator_id THEN v_ratee := v_tx.owner_id;
  ELSIF v_me = v_tx.owner_id THEN v_ratee := v_tx.initiator_id;
  ELSE RAISE EXCEPTION 'not_a_party' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.ratings (transaction_id, rater_id, ratee_id, stars, comment)
  VALUES (p_transaction_id, v_me, v_ratee, p_stars, p_comment) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_create_rating(uuid, int, text) TO authenticated;

CREATE OR REPLACE VIEW public.rating_summary
WITH (security_invoker = true) AS
SELECT ratee_id AS user_id, count(*)::int AS total, round(avg(stars)::numeric, 2) AS avg_stars
FROM public.ratings GROUP BY ratee_id;
