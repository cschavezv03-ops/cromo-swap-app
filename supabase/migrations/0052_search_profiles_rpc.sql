-- Búsqueda de perfiles por nombre/universidad. Respeta scope, bloqueos y
-- amistad para visibilidad (los amigos siempre son visibles, fuera de scope).

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
    p.album_pct,
    p.avatar_url,
    private.is_friend(v_uid, p.id) AS is_friend
  FROM public.profiles p
  WHERE p.id <> v_uid
    AND p.is_anonymous = false
    AND NOT private.is_blocked(v_uid, p.id)
    AND (
      private.is_friend(v_uid, p.id)
      OR (p.university IS NOT NULL AND private.in_scope(v_uid, p.university))
    )
    AND (
      v_q = '' OR p.display_name ILIKE '%' || v_q || '%'
    )
    AND (p_university IS NULL OR p.university = p_university)
  ORDER BY
    private.is_friend(v_uid, p.id) DESC,
    p.display_name ASC
  LIMIT greatest(1, least(p_limit, 100));
END; $$;

REVOKE EXECUTE ON FUNCTION public.fn_search_profiles(text, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_search_profiles(text, text, int) TO authenticated;
