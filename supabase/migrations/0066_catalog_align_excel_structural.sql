-- 0066_catalog_align_excel_structural.sql
-- Phase 1 of 2: schema (CHECK + GENERATED expression) + section remaps + INSERT CC2.
-- Preserves UUIDs by UPDATE-in-place. printed_code is GENERATED, never set manually.

-- 1) Expand sticker_type CHECK
ALTER TABLE catalog_cromos DROP CONSTRAINT IF EXISTS catalog_cromos_sticker_type_check;
ALTER TABLE catalog_cromos ADD CONSTRAINT catalog_cromos_sticker_type_check
  CHECK (sticker_type = ANY (ARRAY[
    'player','team_badge','team_photo','official_emblem','mascot','slogan',
    'ball','host_emblem','stadium','special','brand_emblem','world_cup_history']));

-- 2) Pre-flight: abort if any inventory_items reference MUSEUM/EXTRA
DO $$
DECLARE bad_refs int;
BEGIN
  SELECT count(*) INTO bad_refs FROM inventory_items i
    JOIN catalog_cromos c ON c.id=i.cromo_id
    WHERE c.section_code IN ('MUSEUM','EXTRA');
  IF bad_refs > 0 THEN
    RAISE EXCEPTION 'inventory_items still referencing MUSEUM/EXTRA: %', bad_refs;
  END IF;
END$$;

-- 3) Recreate printed_code GENERATED expression with Excel canon formatting:
--    PANINI 0 → '00', CC <n> → 'CC<n>' (no space), others → '<code> <n>'
--    Must drop dependent view first.
DROP VIEW IF EXISTS cromo_with_country_rarity CASCADE;
ALTER TABLE catalog_cromos DROP COLUMN printed_code;
ALTER TABLE catalog_cromos ADD COLUMN printed_code TEXT GENERATED ALWAYS AS (
  CASE
    WHEN section_code = 'PANINI' THEN '00'
    WHEN section_code = 'CC'     THEN 'CC' || section_number::text
    ELSE section_code || ' ' || section_number::text
  END
) STORED;

-- 4) DELETE EXTRA section (not in real Panini album)
DELETE FROM catalog_cromos WHERE section_code = 'EXTRA';

-- 5) Remap FWC 9 (Panini Logo Foil) → PANINI 00 (preserves UUID + inventory refs)
UPDATE catalog_cromos SET
  section_code='PANINI', section_number=0,
  sticker_type='brand_emblem', page_number=NULL, is_special=true,
  group_code=NULL, country_code=NULL
WHERE section_code='FWC' AND section_number=9 AND catalog_version=2;

-- 6) Remap MUSEUM 1-11 → FWC 9-19 (World Cup History)
UPDATE catalog_cromos SET
  section_code='FWC',
  section_number=section_number+8,
  sticker_type='world_cup_history',
  is_special=true,
  page_number=section_number+1  -- placeholder; overwritten in phase 2
WHERE section_code='MUSEUM' AND catalog_version=2;

-- 7) COCA → CC with player-based reordering (two-step to avoid unique conflicts)
UPDATE catalog_cromos SET section_code='__CC_TMP' WHERE section_code='COCA';

UPDATE catalog_cromos SET
  section_code='CC',
  section_number = CASE display_name
    WHEN 'Lamine Yamal' THEN 1
    WHEN 'Harry Kane' THEN 3
    WHEN 'Santiago Giménez' THEN 4
    WHEN 'Joško Gvardiol' THEN 5
    WHEN 'Federico Valverde' THEN 6
    WHEN 'Jefferson Lerma' THEN 7
    WHEN 'Enner Valencia' THEN 8
    WHEN 'Gabriel Magalhães' THEN 9
    WHEN 'Virgil van Dijk' THEN 10
    WHEN 'Alphonso Davies' THEN 11
    WHEN 'Emiliano Martínez' THEN 12
    WHEN 'Raúl Jiménez' THEN 13
    WHEN 'Lautaro Martínez' THEN 14
  END,
  sticker_type='player', is_special=true,
  group_code=NULL, country_code=NULL, page_number=NULL
WHERE section_code='__CC_TMP';

-- 8) INSERT missing CC2 (Joshua Kimmich, Germany)
INSERT INTO catalog_cromos
  (section_code, section_number, catalog_version, rarity_id, position, jersey,
   player_name, is_active, country_code, group_code, page_number,
   sticker_type, display_name, is_special)
VALUES
  ('CC', 2, 2, 'especial', NULL, NULL,
   'Joshua Kimmich', true, NULL, NULL, NULL,
   'player', 'Joshua Kimmich', true)
ON CONFLICT (section_code, section_number, catalog_version) DO NOTHING;

-- 9) Recreate vista cromo_with_country_rarity (mismo schema que antes)
CREATE OR REPLACE VIEW cromo_with_country_rarity AS
  SELECT cc.id,
         cc.section_number AS n,
         cc.section_code,
         cc.section_number,
         cc.printed_code,
         cc.page_number,
         cc.sticker_type,
         cc.display_name,
         cc.is_special,
         cc.catalog_version,
         cc.country_code,
         co.name AS country_name,
         co.flag_emoji,
         co.stripe,
         co.stripe2,
         co.accent,
         co.group_code AS country_group_code,
         cc.group_code,
         cc.rarity_id,
         r.label AS rarity_label,
         r.sort_order AS rarity_sort_order,
         r.chip_color AS rarity_chip,
         r.text_color AS rarity_text,
         r.dot_color AS rarity_dot,
         cc."position",
         cc.jersey,
         cc.player_name,
         cc.is_active,
         cc.created_at
    FROM catalog_cromos cc
    LEFT JOIN countries co ON co.code = cc.country_code
    LEFT JOIN rarities r  ON r.id   = cc.rarity_id;

-- 10) Structural asserts
DO $$
DECLARE bad int; total int;
BEGIN
  SELECT count(*) INTO bad FROM catalog_cromos
    WHERE section_code IN ('MUSEUM','EXTRA','COCA','__CC_TMP');
  IF bad>0 THEN RAISE EXCEPTION 'deprecated section codes remain: %', bad; END IF;
  SELECT count(*) INTO total FROM catalog_cromos WHERE catalog_version=2;
  IF total <> 994 THEN RAISE EXCEPTION 'expected 994 cromos, got %', total; END IF;
END$$;
