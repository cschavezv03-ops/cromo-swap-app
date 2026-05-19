-- ============================================================================
-- 0081_album_pct_trigger
--
-- La columna `profiles.album_pct` existía pero NUNCA se actualizaba: era NULL
-- para todos los users. La búsqueda y el perfil ajeno la leían y renderizaban
-- "100%" (NULL → NaN → display bug). Este trigger la mantiene sincronizada
-- con `inventory_items.owned_quantity > 0` después de cualquier insert,
-- update o delete.
--
-- También hace backfill inicial para todos los profiles existentes.
-- ============================================================================

CREATE OR REPLACE FUNCTION private.compute_album_pct(p_user uuid) RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
  SELECT COALESCE(
    ROUND(
      100.0 * count(*) FILTER (WHERE owned_quantity > 0)
      / NULLIF(
          (SELECT count(*) FROM public.catalog_cromos WHERE is_active = true),
          0
        )
    )::int,
    0
  )
  FROM public.inventory_items
  WHERE user_id = p_user;
$$;

CREATE OR REPLACE FUNCTION private.refresh_album_pct() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  v_user uuid := COALESCE(NEW.user_id, OLD.user_id);
BEGIN
  UPDATE public.profiles
     SET album_pct = private.compute_album_pct(v_user)
   WHERE id = v_user;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS inventory_items_refresh_album_pct ON public.inventory_items;
CREATE TRIGGER inventory_items_refresh_album_pct
  AFTER INSERT OR UPDATE OF owned_quantity OR DELETE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION private.refresh_album_pct();

-- Backfill: actualizar album_pct para TODOS los profiles existentes.
UPDATE public.profiles p
   SET album_pct = private.compute_album_pct(p.id);
