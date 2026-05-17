-- ============================================================================
-- 0063_push_redesign_and_hardening
--
-- Tres fixes de seguridad/diseño:
--
-- 1) Rediseñar push notifications para llamar DIRECTO a Expo Push API
--    desde el trigger pg_net, sin pasar por edge function ni service_role_key.
--    Expo Push no requiere autenticación: el ExponentPushToken ES la
--    credencial. Resultado: cero secretos en el server.
--
-- 2) REVOKE EXECUTE FROM anon en las 8 RPCs nuevas (introducidas en 0048+).
--    REVOKE FROM PUBLIC en 0050 no quita el grant a anon en Supabase porque
--    los roles anon/authenticated son grants explícitos separados.
--
-- 3) Quitar la policy SELECT del bucket profile-avatars. El bucket es
--    public:true → las URLs públicas funcionan sin policy. La policy
--    actual permite `storage.from(bucket).list()` lo cual expone los
--    paths de TODOS los avatares.
-- ============================================================================

-- --------------------------------------------------------------------------
-- (1) Push notifications directo a Expo
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.dispatch_push_for_notification()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  v_token text;
  v_title text;
  v_body  text;
BEGIN
  -- Lookup del Expo Push Token. Si el user no se registró para push, salimos.
  SELECT expo_push_token INTO v_token
    FROM public.profiles
   WHERE id = NEW.user_id;
  IF v_token IS NULL OR length(v_token) < 10 THEN
    RETURN NEW;
  END IF;

  -- Mapeo kind → título/body. Spanish neutro.
  CASE NEW.kind
    WHEN 'friend_request' THEN
      v_title := 'Nueva solicitud de amistad';
      v_body  := 'Alguien quiere ser tu amigo.';
    WHEN 'friend_accepted' THEN
      v_title := '¡Tu solicitud fue aceptada!';
      v_body  := 'Ya son amigos.';
    WHEN 'match_request' THEN
      v_title := 'Nuevo match';
      v_body  := 'Tienes un nuevo match para intercambiar.';
    WHEN 'match_accepted' THEN
      v_title := 'Match aceptado';
      v_body  := 'Acordaron un intercambio. Coordiná por WhatsApp.';
    WHEN 'match_rejected' THEN
      v_title := 'Match rechazado';
      v_body  := 'No pudieron acordar el intercambio.';
    WHEN 'trade_request', 'sale_request', 'auction_settlement_request' THEN
      v_title := 'Nueva solicitud';
      v_body  := 'Alguien quiere intercambiar contigo.';
    WHEN 'trade_accepted', 'sale_accepted', 'auction_settlement_accepted' THEN
      v_title := 'Solicitud aceptada';
      v_body  := 'Tu intercambio fue aceptado. Coordiná los detalles.';
    WHEN 'trade_completed', 'sale_completed', 'auction_settlement_completed' THEN
      v_title := 'Intercambio completado';
      v_body  := 'Calificá la experiencia.';
    WHEN 'trade_cancelled', 'sale_cancelled', 'auction_settlement_cancelled' THEN
      v_title := 'Intercambio cancelado';
      v_body  := 'La otra parte canceló.';
    ELSE
      v_title := 'Cromo Swap';
      v_body  := 'Tienes una nueva notificación.';
  END CASE;

  -- POST directo a Expo Push API. Fire-and-forget vía pg_net.
  -- NO requiere Authorization header — el push token es la credencial.
  PERFORM extensions.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Accept', 'application/json'
    ),
    body := jsonb_build_object(
      'to',    v_token,
      'sound', 'default',
      'title', v_title,
      'body',  v_body,
      'data',  jsonb_build_object(
        'kind', NEW.kind,
        'notification_id', NEW.id,
        'payload', NEW.payload
      )
    )::text
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca bloquear el INSERT de la notification por un fallo de push.
  RETURN NEW;
END; $$;

-- El trigger ya existe (creado en 0049) — apunta a la función que acabamos
-- de redefinir, no hace falta DROP/CREATE.

-- --------------------------------------------------------------------------
-- (2) REVOKE EXECUTE FROM anon en RPCs nuevas
-- --------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.fn_set_push_token(text)             FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_send_friend_request(uuid)        FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_respond_friend_request(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_remove_friend(uuid)              FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_create_rating(uuid, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_search_profiles(text, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_buy_now_auction(uuid)            FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_friend_inventory(uuid, text, integer) FROM anon;

-- --------------------------------------------------------------------------
-- (3) Bucket profile-avatars: quitar SELECT policy permisiva
-- --------------------------------------------------------------------------
-- El bucket es public:true → URLs públicas funcionan sin policy.
-- La policy SELECT actual deja listar todos los archivos. La eliminamos.

DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
