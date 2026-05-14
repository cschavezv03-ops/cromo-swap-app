-- =============================================================================
-- Migration: 0002_reference_tables.sql
-- Purpose:   Create universities, countries, rarities lookup tables; seed 8
--            universities, 16 countries, 6 rarities; RLS: SELECT to
--            anon+authenticated, no client writes.
-- Deps:      0001 (private schema, moddatetime, citext extension)
-- Phase:     2 – Data Model & Security Core
--
-- NOTE: citext extension is enabled in 0001. The email_domain column uses
--       extensions.citext (schema-qualified) since citext lives in the
--       extensions schema on Supabase, not in public.
--
-- Rollback (-- down):
--   DROP TABLE IF EXISTS public.rarities CASCADE;
--   DROP TABLE IF EXISTS public.countries CASCADE;
--   DROP TABLE IF EXISTS public.universities CASCADE;
-- =============================================================================

-- ===========================================================================
-- TABLE: universities
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.universities (
  id           text        NOT NULL,
  name         text        NOT NULL,
  short        text        NOT NULL,
  color        text        NOT NULL,  -- hex color string (e.g. '#1F4D8C')
  -- email_domain: single canonical .edu.ec domain per university.
  -- NULL is acceptable while verification is pending (Phase 3 confirms).
  -- TODO Phase 3: verify PUCE domains (puce.ec / pucesa.edu.ec / pucesi.edu.ec
  --              variants) and EPN primary. If multi-domain needed, add
  --              university_email_domains(university_id, domain) table.
  email_domain extensions.citext      NULL        UNIQUE,
  CONSTRAINT universities_pkey PRIMARY KEY (id)
);

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

-- Deny by default: RLS is ON. No policy = no access.
-- Client roles can SELECT only; no write policies.
CREATE POLICY "universities_read_all"
  ON public.universities
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- -------------------------------------------------------------------
-- Seed: 8 universities (verbatim from data.jsx UNIVERSITIES +
--       canonical .edu.ec domains from design). Idempotent.
-- -------------------------------------------------------------------
INSERT INTO public.universities (id, name, short, color, email_domain)
VALUES
  ('EPN',  'Escuela Politécnica Nacional',          'EPN',  '#1F4D8C', 'epn.edu.ec'),
  ('PUCE', 'Pontificia Universidad Católica',        'PUCE', '#0E3B73', 'puce.edu.ec'),  -- TODO verify: pucesa/pucesi variants
  ('UCE',  'Universidad Central del Ecuador',        'UCE',  '#1F6B47', 'uce.edu.ec'),
  ('USFQ', 'Universidad San Francisco de Quito',     'USFQ', '#7A1E2B', 'usfq.edu.ec'),
  ('UDLA', 'Universidad de las Américas',            'UDLA', '#B83B1F', 'udla.edu.ec'),
  ('UIDE', 'Universidad Internacional',              'UIDE', '#3D2C6B', 'uide.edu.ec'),
  ('UTE',  'UTE',                                    'UTE',  '#1A5B5B', 'ute.edu.ec'),
  ('ESPE', 'ESPE',                                   'ESPE', '#3D5A2E', 'espe.edu.ec')
ON CONFLICT (id) DO NOTHING;

-- ===========================================================================
-- TABLE: countries
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.countries (
  code     text NOT NULL,  -- 3-char code (e.g. 'ECU')
  name     text NOT NULL,
  flag_emoji text NOT NULL,
  stripe   text NOT NULL,  -- primary stripe hex
  stripe2  text NOT NULL,  -- secondary stripe hex
  accent   text NOT NULL,  -- accent hex
  CONSTRAINT countries_pkey PRIMARY KEY (code)
);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "countries_read_all"
  ON public.countries
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- -------------------------------------------------------------------
-- Seed: 16 countries verbatim from data.jsx COUNTRIES
-- -------------------------------------------------------------------
INSERT INTO public.countries (code, name, flag_emoji, stripe, stripe2, accent)
VALUES
  ('ECU', 'Ecuador',       '🇪🇨', '#FFD200', '#0033A0', '#D52B1E'),
  ('ARG', 'Argentina',     '🇦🇷', '#6CACE4', '#FFFFFF', '#74ACDF'),
  ('BRA', 'Brasil',        '🇧🇷', '#FFD200', '#009B3A', '#009B3A'),
  ('ESP', 'España',        '🇪🇸', '#C60B1E', '#FFC400', '#C60B1E'),
  ('FRA', 'Francia',       '🇫🇷', '#0055A4', '#FFFFFF', '#0055A4'),
  ('GER', 'Alemania',      '🇩🇪', '#000000', '#DD0000', '#FFCE00'),
  ('JPN', 'Japón',         '🇯🇵', '#BC002D', '#FFFFFF', '#BC002D'),
  ('MAR', 'Marruecos',     '🇲🇦', '#C1272D', '#006233', '#006233'),
  ('NED', 'Países Bajos',  '🇳🇱', '#FF6F00', '#21468B', '#FF6F00'),
  ('POR', 'Portugal',      '🇵🇹', '#046A38', '#DA291C', '#046A38'),
  ('CRO', 'Croacia',       '🇭🇷', '#171796', '#FFFFFF', '#FF0000'),
  ('MEX', 'México',        '🇲🇽', '#006847', '#CE1126', '#006847'),
  ('USA', 'EE.UU.',        '🇺🇸', '#B22234', '#3C3B6E', '#3C3B6E'),
  ('CAN', 'Canadá',        '🇨🇦', '#D52B1E', '#FFFFFF', '#D52B1E'),
  ('KOR', 'Corea del Sur', '🇰🇷', '#CD2E3A', '#0047A0', '#CD2E3A'),
  ('URU', 'Uruguay',       '🇺🇾', '#7B9FD1', '#FFFFFF', '#7B9FD1')
ON CONFLICT (code) DO NOTHING;

-- ===========================================================================
-- TABLE: rarities
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.rarities (
  id          text    NOT NULL,  -- e.g. 'comun', 'legendario'
  label       text    NOT NULL,
  sort_order  integer NOT NULL,  -- 1=comun (easiest) … 6=legendario (rarest)
  chip_color  text    NOT NULL,  -- background chip color
  text_color  text    NOT NULL,
  dot_color   text    NOT NULL,
  CONSTRAINT rarities_pkey PRIMARY KEY (id)
);

ALTER TABLE public.rarities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rarities_read_all"
  ON public.rarities
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- -------------------------------------------------------------------
-- Seed: 6 rarities verbatim from data.jsx RARITIES (chip→chip_color,
--       text→text_color, dot→dot_color) + sort_order
-- -------------------------------------------------------------------
INSERT INTO public.rarities (id, label, sort_order, chip_color, text_color, dot_color)
VALUES
  ('comun',      'Común',       1, '#E8E5DE', '#3D3A33', '#8B8678'),
  ('poco',       'Poco común',  2, '#E0EBE3', '#2A4A36', '#5B8C73'),
  ('raro',       'Raro',        3, '#E4E9F2', '#27406D', '#4A6BA6'),
  ('muyraro',    'Muy raro',    4, '#EEE5F0', '#5A3168', '#8E5BA0'),
  ('especial',   'Especial',    5, '#F5E6D3', '#6B4513', '#B8862C'),
  ('legendario', 'Legendario',  6, '#1F1B14', '#FFD46B', '#FFD46B')
ON CONFLICT (id) DO NOTHING;
