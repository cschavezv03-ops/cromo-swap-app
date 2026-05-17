-- Cierra los 2 unindexed FK que el advisor de performance detectó.
-- Sin estos, los ON DELETE/UPDATE de las tablas referenciadas (countries
-- y profiles) hacen full-scan de la tabla hija — caro a medida que crece.

CREATE INDEX IF NOT EXISTS catalog_cromos_country_code_idx
  ON public.catalog_cromos(country_code)
  WHERE country_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS transactions_cancelled_by_idx
  ON public.transactions(cancelled_by)
  WHERE cancelled_by IS NOT NULL;

COMMENT ON INDEX public.catalog_cromos_country_code_idx IS
  'Cubre el FK catalog_cromos_country_code_fkey y acelera filtros por país';
COMMENT ON INDEX public.transactions_cancelled_by_idx IS
  'Cubre el FK transactions_cancelled_by_fkey y acelera audit trail';
