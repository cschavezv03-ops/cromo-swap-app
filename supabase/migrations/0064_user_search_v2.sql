-- ============================================================================
-- 0064_user_search_v2
--
-- Búsqueda global de personas: sacar el filtro de scope de fn_search_profiles
-- + incluir is_friend en policy profiles_read_others (los amigos siempre
-- pueden ver el perfil completo, aun fuera de scope) + RPC fn_get_user_card
-- para vista pública mínima a usuarios fuera de scope.
-- ============================================================================

-- (1) Búsqueda global — saca el filtro in_scope, mantiene blocks y no-self.
CREATE OR REPLACE FUNCTION public.fn_search_profiles(
  p_query text,
  p_university text DEFAULT NULL,
  p_limit int DEFAULT 30
) RETURNS TABLE (
  id uuid,
  display_name text,
  university text,
  album_pct numeric,
  avatar_url text,
  is_friend boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_q text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  v_q := trim(coalesce(p_query, ''));

  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.university,
    p.album_pct::numeric,
    p.avatar_url,
    private.is_friend(v_uid, p.id) AS is_friend
  FROM public.profiles p
  WHERE p.id <> v_uid
    AND p.is_anonymous = false
    AND NOT private.is_blocked(v_uid, p.id)
    AND (v_q = '' OR p.display_name ILIKE '%' || v_q || '%')
    AND (p_university IS NULL OR p.university = p_university)
  ORDER BY
    private.is_friend(v_uid, p.id) DESC,
    private.in_scope(v_uid, p.university) DESC,
    p.display_name ASC
  LIMIT greatest(1, least(p_limit, 100));
END; $$;

REVOKE EXECUTE ON FUNCTION public.fn_search_profiles(text, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_search_profiles(text, text, int) TO authenticated;

-- (2) Policy profiles_read_others: incluir is_friend.
-- Los amigos siempre ven el perfil completo, aun fuera de scope.
DROP POLICY IF EXISTS profiles_read_others ON public.profiles;
CREATE POLICY profiles_read_others ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id <> (SELECT auth.uid())
    AND NOT private.is_guest()
    AND NOT private.is_blocked((SELECT auth.uid()), id)
    AND (
      private.in_scope((SELECT auth.uid()), university)
      OR private.is_friend((SELECT auth.uid()), id)
      OR private.has_accepted_transaction((SELECT auth.uid()), id)
    )
  );

-- (3) RPC para vista pública mínima de CUALQUIER usuario (gated solo por
-- blocks). Devuelve los mismos campos que fn_search_profiles. Útil para
-- el perfil ajeno cuando la persona NO está en scope ni es amigo —
-- mostramos la card minimal con FriendButton.
CREATE OR REPLACE FUNCTION public.fn_get_user_card(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  display_name text,
  university text,
  album_pct numeric,
  avatar_url text,
  is_friend boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF v_uid = p_user_id THEN RAISE EXCEPTION 'self_card' USING ERRCODE = '22023'; END IF;
  IF private.is_blocked(v_uid, p_user_id) THEN RAISE EXCEPTION 'blocked' USING ERRCODE = '42501'; END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.university,
    p.album_pct::numeric,
    p.avatar_url,
    private.is_friend(v_uid, p.id) AS is_friend
  FROM public.profiles p
  WHERE p.id = p_user_id
    AND p.is_anonymous = false
  LIMIT 1;
END; $$;

REVOKE EXECUTE ON FUNCTION public.fn_get_user_card(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_get_user_card(uuid) TO authenticated;
