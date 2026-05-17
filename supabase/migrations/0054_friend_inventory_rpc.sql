-- Devuelve un slice del inventario de OTRO usuario, gated por amistad.
-- Si quien llama no es amigo del target, devuelve 0 rows (no RAISE — silencioso).
-- p_kind: 'repeated' → owned_quantity >= 2; 'missing' → cromos del catálogo donde
-- el target NO tiene fila o owned_quantity = 0.

CREATE OR REPLACE FUNCTION public.fn_friend_inventory(
  p_user_id uuid,
  p_kind text,
  p_limit int DEFAULT 200
) RETURNS TABLE (
  cromo_id uuid,
  printed_code text,
  jersey int,
  display_name text,
  player_name text,
  country_code text,
  owned_quantity int
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT private.is_friend(v_caller, p_user_id) THEN RETURN; END IF;
  IF p_kind NOT IN ('repeated','missing') THEN RAISE EXCEPTION 'invalid_kind'; END IF;

  IF p_kind = 'repeated' THEN
    RETURN QUERY
      SELECT
        c.id AS cromo_id,
        c.printed_code,
        c.jersey,
        c.display_name,
        c.player_name,
        c.country_code,
        i.owned_quantity
      FROM public.inventory_items i
      JOIN public.catalog_cromos c ON c.id = i.cromo_id
      WHERE i.user_id = p_user_id
        AND i.owned_quantity >= 2
        AND c.is_active = true
      ORDER BY i.owned_quantity DESC, c.country_code, c.jersey
      LIMIT greatest(1, least(p_limit, 500));
  ELSE
    RETURN QUERY
      SELECT
        c.id AS cromo_id,
        c.printed_code,
        c.jersey,
        c.display_name,
        c.player_name,
        c.country_code,
        0 AS owned_quantity
      FROM public.catalog_cromos c
      LEFT JOIN public.inventory_items i
        ON i.cromo_id = c.id AND i.user_id = p_user_id
      WHERE c.is_active = true
        AND (i.cromo_id IS NULL OR i.owned_quantity = 0)
      ORDER BY c.country_code, c.jersey
      LIMIT greatest(1, least(p_limit, 500));
  END IF;
END; $$;

REVOKE EXECUTE ON FUNCTION public.fn_friend_inventory(uuid, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_friend_inventory(uuid, text, int) TO authenticated;
