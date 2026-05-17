-- ============================================================================
-- Sistema de amigos (mutual, Facebook-style)
-- ============================================================================

CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','rejected','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT friendships_no_self CHECK (requester_id <> addressee_id),
  CONSTRAINT friendships_unique_pair UNIQUE (requester_id, addressee_id)
);

CREATE INDEX friendships_requester_idx ON public.friendships(requester_id, status);
CREATE INDEX friendships_addressee_idx ON public.friendships(addressee_id, status);

-- Predicado para RLS y queries
CREATE OR REPLACE FUNCTION private.is_friend(a uuid, b uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = a AND addressee_id = b)
        OR (requester_id = b AND addressee_id = a))
  );
$$;
GRANT EXECUTE ON FUNCTION private.is_friend(uuid, uuid) TO authenticated;

-- RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY friendships_parties_read ON public.friendships FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Notification emitter (mismo patrón que emit_match_notification)
CREATE OR REPLACE FUNCTION private.emit_friendship_notification(
  p_user_id uuid, p_kind text, p_friendship_id uuid, p_extra jsonb DEFAULT '{}'::jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, kind, payload)
  VALUES (p_user_id, p_kind, jsonb_build_object('friendship_id', p_friendship_id) || p_extra);
END;
$$;

-- RPC: fn_send_friend_request
-- (cuerpo completo aplicado vía mcp__supabase__apply_migration el 2026-05-17;
--  ver server para la lógica idempotente con reuso del row entre pair).
CREATE OR REPLACE FUNCTION public.fn_send_friend_request(p_target uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_me uuid := auth.uid();
  v_existing public.friendships;
  v_id uuid;
  v_my_name text;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF v_me = p_target THEN RAISE EXCEPTION 'cannot_friend_self' USING ERRCODE = '22023'; END IF;
  IF private.is_blocked(v_me, p_target) THEN RAISE EXCEPTION 'blocked' USING ERRCODE = '42501'; END IF;

  SELECT * INTO v_existing FROM public.friendships
   WHERE (requester_id = v_me AND addressee_id = p_target)
      OR (requester_id = p_target AND addressee_id = v_me)
   LIMIT 1;

  IF v_existing.status = 'accepted' THEN RETURN v_existing.id; END IF;
  IF v_existing.status = 'pending' AND v_existing.addressee_id = v_me THEN
    UPDATE public.friendships SET status='accepted', responded_at=now() WHERE id = v_existing.id;
    PERFORM private.emit_friendship_notification(v_existing.requester_id, 'friend_accepted', v_existing.id,
      jsonb_build_object('counterparty_id', v_me));
    RETURN v_existing.id;
  END IF;
  IF v_existing.status = 'pending' THEN RETURN v_existing.id; END IF;

  IF v_existing.id IS NOT NULL THEN
    UPDATE public.friendships SET requester_id=v_me, addressee_id=p_target, status='pending',
      created_at=now(), responded_at=NULL WHERE id = v_existing.id RETURNING id INTO v_id;
  ELSE
    INSERT INTO public.friendships (requester_id, addressee_id, status)
    VALUES (v_me, p_target, 'pending') RETURNING id INTO v_id;
  END IF;

  SELECT display_name INTO v_my_name FROM public.profiles WHERE id = v_me;
  PERFORM private.emit_friendship_notification(p_target, 'friend_request', v_id,
    jsonb_build_object('counterparty_id', v_me, 'counterparty_name', coalesce(v_my_name, 'Alguien')));
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_send_friend_request(uuid) TO authenticated;

-- RPC: fn_respond_friend_request
CREATE OR REPLACE FUNCTION public.fn_respond_friend_request(p_request_id uuid, p_response text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_me uuid := auth.uid();
  v_row public.friendships;
  v_my_name text;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF p_response NOT IN ('accepted','rejected') THEN RAISE EXCEPTION 'invalid_response' USING ERRCODE = '22023'; END IF;
  SELECT * INTO v_row FROM public.friendships WHERE id = p_request_id;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = '02000'; END IF;
  IF v_row.addressee_id <> v_me THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF v_row.status <> 'pending' THEN RAISE EXCEPTION 'not_pending' USING ERRCODE = '22023'; END IF;

  UPDATE public.friendships SET status=p_response, responded_at=now() WHERE id = p_request_id;
  IF p_response = 'accepted' THEN
    SELECT display_name INTO v_my_name FROM public.profiles WHERE id = v_me;
    PERFORM private.emit_friendship_notification(v_row.requester_id, 'friend_accepted', v_row.id,
      jsonb_build_object('counterparty_id', v_me, 'counterparty_name', coalesce(v_my_name, 'Alguien')));
  END IF;
  RETURN p_response;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_respond_friend_request(uuid, text) TO authenticated;

-- RPC: fn_remove_friend
CREATE OR REPLACE FUNCTION public.fn_remove_friend(p_other uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_me uuid := auth.uid(); v_row_id uuid;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT id INTO v_row_id FROM public.friendships
   WHERE ((requester_id=v_me AND addressee_id=p_other) OR (requester_id=p_other AND addressee_id=v_me))
     AND status='accepted' LIMIT 1;
  IF v_row_id IS NULL THEN RETURN; END IF;
  UPDATE public.friendships SET status='removed', responded_at=now() WHERE id = v_row_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_remove_friend(uuid) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
