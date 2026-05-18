-- Registro de aceptación de Términos y Política de Privacidad por user.
-- LOPDP requiere poder demostrar el consentimiento expreso. Guardamos
-- versión del documento aceptado + timestamp.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_version text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at      timestamptz;

CREATE INDEX IF NOT EXISTS profiles_terms_version_idx
  ON public.profiles(terms_accepted_version)
  WHERE terms_accepted_version IS NOT NULL;
