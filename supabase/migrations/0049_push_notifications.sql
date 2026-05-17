-- Push notifications nativas (Expo Push API)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expo_push_token text;

CREATE INDEX IF NOT EXISTS profiles_push_token_idx
  ON public.profiles(expo_push_token)
  WHERE expo_push_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fn_set_push_token(p_token text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF p_token IS NULL OR length(p_token) < 10 THEN
    UPDATE public.profiles SET expo_push_token = NULL WHERE id = auth.uid();
  ELSE
    UPDATE public.profiles SET expo_push_token = p_token WHERE id = auth.uid();
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_set_push_token(text) TO authenticated;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger AFTER INSERT on notifications → invoca edge function send_push.
-- Fire-and-forget. Requiere `app.service_role_key` seteado en el cluster
-- (ALTER DATABASE postgres SET app.service_role_key = '<key>'). Si no está,
-- el push no se envía pero la notification in-app llega igual.
CREATE OR REPLACE FUNCTION private.dispatch_push_for_notification() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_url text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id AND expo_push_token IS NOT NULL) THEN
    RETURN NEW;
  END IF;
  v_url := 'https://wpcnqfyfcnebtmxstcpo.supabase.co/functions/v1/send_push';
  PERFORM extensions.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(current_setting('app.service_role_key', true), '')
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'kind', NEW.kind,
      'payload', NEW.payload,
      'notification_id', NEW.id
    )::text
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS notifications_dispatch_push ON public.notifications;
CREATE TRIGGER notifications_dispatch_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION private.dispatch_push_for_notification();
