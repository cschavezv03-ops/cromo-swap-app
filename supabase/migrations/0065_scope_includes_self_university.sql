-- ============================================================================
-- 0065_scope_includes_self_university
--
-- Bug: el scope de un usuario podía no incluir su propia universidad,
-- haciendo que NO viera perfiles ni listings de su propia uni (porque
-- private.in_scope checkea `target_uni = ANY(my_scope)`).
--
-- Fix:
--   1. Trigger BEFORE INSERT/UPDATE en profiles que garantiza que
--      `university` esté en `scope`. Funciona en CUALQUIER flujo (signup,
--      profile-edit, RPCs admin) sin tener que confiar en el frontend.
--   2. Backfill retroactivo: agrega la uni propia a scope para todos los
--      profiles existentes que la tenían fuera.
-- ============================================================================

CREATE OR REPLACE FUNCTION private.enforce_self_university_in_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF NEW.university IS NOT NULL
     AND (NEW.scope IS NULL OR NOT (NEW.university = ANY(NEW.scope))) THEN
    NEW.scope := array_append(coalesce(NEW.scope, ARRAY[]::text[]), NEW.university);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS profiles_enforce_self_uni_in_scope ON public.profiles;
CREATE TRIGGER profiles_enforce_self_uni_in_scope
  BEFORE INSERT OR UPDATE OF university, scope ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.enforce_self_university_in_scope();

-- Backfill retroactivo
UPDATE public.profiles
   SET scope = array_append(scope, university)
 WHERE university IS NOT NULL
   AND NOT (university = ANY(coalesce(scope, ARRAY[]::text[])));
