-- Hardening: las RPCs nuevas SECURITY DEFINER quedaron con EXECUTE TO PUBLIC
-- por default. Internamente validan auth.uid() (no explotables) pero el
-- advisor las marca. Revocamos PUBLIC y dejamos GRANT explícito a authenticated.

REVOKE EXECUTE ON FUNCTION public.fn_send_friend_request(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_respond_friend_request(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_remove_friend(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_create_rating(uuid, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_set_push_token(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.fn_send_friend_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_respond_friend_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_remove_friend(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_rating(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_set_push_token(text) TO authenticated;
