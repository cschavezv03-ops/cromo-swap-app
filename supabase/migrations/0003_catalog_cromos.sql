-- =============================================================================
-- Migration: 0003_catalog_cromos.sql
-- Purpose:   Create catalog_cromos table; cromo_with_country_rarity view
--            (flat shape for CromoCard); RLS (SELECT to anon+authenticated);
--            240-row seed via PL/pgSQL DO block reproducing buildAlbum()
--            exactly.
-- Deps:      0002 (countries, rarities)
-- Phase:     2 – Data Model & Security Core
--
-- NOTE: catalog_cromos does NOT denormalize country visuals — those live in
--       the countries table. cromo_with_country_rarity is the join view for
--       CromoCard consumption. (Design decision #11)
--
-- Rollback (-- down):
--   DROP VIEW  IF EXISTS public.cromo_with_country_rarity;
--   DROP TABLE IF EXISTS public.catalog_cromos CASCADE;
-- =============================================================================

-- ===========================================================================
-- TABLE: catalog_cromos
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.catalog_cromos (
  id              uuid    NOT NULL DEFAULT gen_random_uuid(),
  number          integer NOT NULL,
  catalog_version integer NOT NULL DEFAULT 1,
  country         text    NOT NULL REFERENCES public.countries(code) ON DELETE RESTRICT,
  rarity          text    NOT NULL REFERENCES public.rarities(id)   ON DELETE RESTRICT,
  position        text             CHECK (position IN ('POR','DEF','MED','DEL')),
  jersey          integer          CHECK (jersey BETWEEN 1 AND 23),
  player_name     text    NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_cromos_pkey PRIMARY KEY (id),
  CONSTRAINT catalog_cromos_number_version_unique UNIQUE (number, catalog_version)
);

ALTER TABLE public.catalog_cromos ENABLE ROW LEVEL SECURITY;

-- Deny by default: no write policies for client roles.
CREATE POLICY "catalog_cromos_read_all"
  ON public.catalog_cromos
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ===========================================================================
-- VIEW: cromo_with_country_rarity
-- Flat shape for CromoCard — joins catalog_cromos + countries + rarities.
-- CromoCard contract: n, flag_emoji, name, stripe, stripe2, accent,
--                     player_name, rarity id+label+chip/text/dot, position, jersey
-- ===========================================================================
CREATE OR REPLACE VIEW public.cromo_with_country_rarity AS
  SELECT
    cc.id,
    cc.number                  AS n,
    cc.catalog_version,
    cc.country                 AS country_code,
    co.name                    AS country_name,
    co.flag_emoji,
    co.stripe,
    co.stripe2,
    co.accent,
    cc.rarity                  AS rarity_id,
    r.label                    AS rarity_label,
    r.sort_order               AS rarity_sort_order,
    r.chip_color               AS rarity_chip,
    r.text_color               AS rarity_text,
    r.dot_color                AS rarity_dot,
    cc.position,
    cc.jersey,
    cc.player_name,
    cc.is_active,
    cc.created_at
  FROM public.catalog_cromos cc
  JOIN public.countries co ON co.code = cc.country
  JOIN public.rarities   r  ON r.id   = cc.rarity;

-- View inherits catalog_cromos RLS through the underlying table SELECT policy.
-- Explicitly revoke from public (belt-and-suspenders).
REVOKE ALL ON public.cromo_with_country_rarity FROM public;
GRANT SELECT ON public.cromo_with_country_rarity TO anon, authenticated;

-- ===========================================================================
-- SEED: 240 cromos via PL/pgSQL DO block reproducing buildAlbum() exactly.
--
-- buildAlbum() logic (from data.jsx):
--   outer: COUNTRIES[ci] (ci=0..15, 16 countries, in order below)
--   inner: i in 0..14 (15 cromos per country)
--   n: 1..240 (global counter)
--   surname: SURNAMES_BY_COUNTRY[code][i % len(surnames)]
--   initial: chr(65 + ((n*7 + i) % 26))  — uppercase letter
--   player_name: initial || '. ' || surname
--   rarity rule (EXACT branch order):
--     i=0           → 'especial'
--     i=14          → 'legendario'
--     i%5=0         → 'raro'       (i∈{5,10} within 0..14)
--     i%3=0         → 'poco'       (i∈{3,6,9,12} within 0..14, excl. above)
--     i=7           → 'muyraro'    (i=7: i%5≠0, i%3≠0, hits this branch)
--     else          → 'comun'
--   position: ['POR','DEF','MED','DEL'][(n+i) % 4]   (PG 1-indexed: +1)
--   jersey:   ((n*3 + i) % 23) + 1
--
-- Idempotent: ON CONFLICT (number, catalog_version) DO NOTHING
-- ===========================================================================
DO $$
DECLARE
  -- Countries in order (matches COUNTRIES array in data.jsx)
  countries_codes  text[]  := ARRAY['ECU','ARG','BRA','ESP','FRA','GER','JPN','MAR','NED','POR','CRO','MEX','USA','CAN','KOR','URU'];
  positions_arr    text[]  := ARRAY['POR','DEF','MED','DEL'];

  -- Surnames per country (verbatim from SURNAMES_BY_COUNTRY in data.jsx)
  surnames_ecu  text[] := ARRAY['NAVARRO','SUÁREZ','CAICEDO','MENDOZA','PALACIOS','ORTIZ','VERA','ANGULO','RUEDA','LOOR','YÉPEZ','JIMÉNEZ'];
  surnames_arg  text[] := ARRAY['DI MARÍA','FERNÁNDEZ','ÁLVAREZ','PAREDES','ROJAS','MARTÍN','BENÍTEZ','GUTIÉRREZ'];
  surnames_bra  text[] := ARRAY['SILVA','OLIVEIRA','SANTOS','PEREIRA','COSTA','FERREIRA','BARBOSA'];
  surnames_esp  text[] := ARRAY['GARCÍA','LÓPEZ','MORENO','TORRES','RUIZ','SANZ','IGLESIAS'];
  surnames_fra  text[] := ARRAY['LEFÈVRE','DUBOIS','BERNARD','PETIT','RICHARD','MOREAU'];
  surnames_ger  text[] := ARRAY['MÜLLER','SCHMIDT','WEBER','FISCHER','WAGNER'];
  surnames_jpn  text[] := ARRAY['TANAKA','SUZUKI','YAMADA','WATANABE','NAKAMURA'];
  surnames_mar  text[] := ARRAY['BENNANI','IDRISSI','AMRANI','CHAOUI'];
  surnames_ned  text[] := ARRAY['DE JONG','VAN DAM','BAKKER','VISSER'];
  surnames_por  text[] := ARRAY['CARVALHO','SOUSA','ALMEIDA','CUNHA'];
  surnames_cro  text[] := ARRAY['HORVAT','KOVAČ','NOVAK','MARIĆ'];
  surnames_mex  text[] := ARRAY['HERNÁNDEZ','RAMÍREZ','CHÁVEZ','CASTRO'];
  surnames_usa  text[] := ARRAY['JOHNSON','MILLER','DAVIS','BROWN'];
  surnames_can  text[] := ARRAY['TREMBLAY','WILSON','ROY'];
  surnames_kor  text[] := ARRAY['KIM','LEE','PARK','CHOI'];
  surnames_uru  text[] := ARRAY['RODRÍGUEZ','PÉREZ','ACOSTA'];

  -- Working vars
  c_code    text;
  surnames  text[];
  n         integer := 1;
  i         integer;
  surname   text;
  initial   text;
  rarity    text;
  position  text;
  jersey    integer;
  player    text;
BEGIN
  FOR ci IN 1..16 LOOP
    c_code := countries_codes[ci];

    -- Map code → surnames array
    CASE c_code
      WHEN 'ECU' THEN surnames := surnames_ecu;
      WHEN 'ARG' THEN surnames := surnames_arg;
      WHEN 'BRA' THEN surnames := surnames_bra;
      WHEN 'ESP' THEN surnames := surnames_esp;
      WHEN 'FRA' THEN surnames := surnames_fra;
      WHEN 'GER' THEN surnames := surnames_ger;
      WHEN 'JPN' THEN surnames := surnames_jpn;
      WHEN 'MAR' THEN surnames := surnames_mar;
      WHEN 'NED' THEN surnames := surnames_ned;
      WHEN 'POR' THEN surnames := surnames_por;
      WHEN 'CRO' THEN surnames := surnames_cro;
      WHEN 'MEX' THEN surnames := surnames_mex;
      WHEN 'USA' THEN surnames := surnames_usa;
      WHEN 'CAN' THEN surnames := surnames_can;
      WHEN 'KOR' THEN surnames := surnames_kor;
      WHEN 'URU' THEN surnames := surnames_uru;
    END CASE;

    FOR i IN 0..14 LOOP
      -- surname: i % len(surnames) — PG arrays are 1-indexed
      surname := surnames[(i % array_length(surnames, 1)) + 1];

      -- initial: chr(65 + ((n*7 + i) % 26)) — exact JS formula
      initial := chr(65 + ((n * 7 + i) % 26));

      player := initial || '. ' || surname;

      -- rarity: EXACT branch order from buildAlbum()
      IF    i = 0  THEN rarity := 'especial';
      ELSIF i = 14 THEN rarity := 'legendario';
      ELSIF i % 5 = 0 THEN rarity := 'raro';
      ELSIF i % 3 = 0 THEN rarity := 'poco';
      ELSIF i = 7  THEN rarity := 'muyraro';
      ELSE rarity := 'comun';
      END IF;

      -- position: ['POR','DEF','MED','DEL'][(n+i) % 4]  (PG 1-indexed: +1)
      position := positions_arr[((n + i) % 4) + 1];

      -- jersey: ((n*3 + i) % 23) + 1
      jersey := ((n * 3 + i) % 23) + 1;

      INSERT INTO public.catalog_cromos
        (number, catalog_version, country, rarity, position, jersey, player_name, is_active)
      VALUES
        (n, 1, c_code, rarity, position, jersey, player, true)
      ON CONFLICT (number, catalog_version) DO NOTHING;

      n := n + 1;
    END LOOP;
  END LOOP;
END;
$$;
