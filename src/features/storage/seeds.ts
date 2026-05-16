import { getDatabase, type CatalogCromoLocal, type CountryLocal, type RarityLocal, type UniversityLocal } from './db';
import { kv, KvKey } from './kv';

// Bundled catalog JSON — generated from Supabase. See scripts/dump-catalog.
// Note: importing a JSON asset works in Expo via Metro; types come from the
// `.json` declaration. We also keep a type below for documentation.
import bundle from '../../../assets/catalog/mundial-2026.json';

type CatalogBundle = {
  catalog_version: number;
  generated_at: string;
  universities: UniversityLocal[];
  countries: CountryLocal[];
  rarities: RarityLocal[];
  cromos: Array<{
    id: string;
    catalog_version: number;
    section_code: string;
    section_number: number;
    country_code: string | null;
    rarity_id: string;
    jersey: number | null;
    player_name: string | null;
    display_name: string;
    position: string | null;
    sticker_type: string;
    is_special: number;
    page_number: number | null;
    group_code: string | null;
    printed_code: string;
  }>;
};

const data = bundle as unknown as CatalogBundle;

/**
 * On cold start, seed the local SQLite with the bundled catalog if the local
 * version is missing or older than the bundle version.
 *
 * Returns the effective local catalog version after seeding.
 */
export async function ensureCatalogSeeded(): Promise<number> {
  const db = await getDatabase();
  const localVersion = Number(kv.getString(KvKey.catalogVersion) ?? '0');

  if (localVersion >= data.catalog_version) {
    return localVersion;
  }

  await db.withExclusiveTransactionAsync(async (tx) => {
    // Reset reference tables (countries/rarities/universities) — they may shrink
    // between catalog versions. Cromos are upserted to keep inventory FK valid.
    await tx.execAsync(`
      DELETE FROM countries_local;
      DELETE FROM rarities_local;
      DELETE FROM universities_local;
    `);

    for (const c of data.countries) {
      await tx.runAsync(
        `INSERT INTO countries_local (code, name, flag_emoji, stripe, accent, group_code) VALUES (?, ?, ?, ?, ?, ?)`,
        [c.code, c.name, c.flag_emoji, c.stripe, c.accent, c.group_code],
      );
    }

    for (const r of data.rarities) {
      await tx.runAsync(
        `INSERT INTO rarities_local (id, label, sort_order, chip_color, text_color, dot_color) VALUES (?, ?, ?, ?, ?, ?)`,
        [r.id, r.label, r.sort_order, r.chip_color, r.text_color, r.dot_color],
      );
    }

    for (const u of data.universities) {
      await tx.runAsync(
        `INSERT INTO universities_local (id, name, short, color, email_domain) VALUES (?, ?, ?, ?, ?)`,
        [u.id, u.name, u.short, u.color, u.email_domain],
      );
    }

    for (const c of data.cromos) {
      await tx.runAsync(
        `INSERT OR REPLACE INTO catalog_cromos_local (
          id, catalog_version, section_code, section_number, country_code,
          rarity_id, jersey, player_name, display_name, position,
          sticker_type, is_special, page_number, group_code, printed_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          c.id,
          c.catalog_version,
          c.section_code,
          c.section_number,
          c.country_code,
          c.rarity_id,
          c.jersey,
          c.player_name,
          c.display_name,
          c.position,
          c.sticker_type,
          c.is_special,
          c.page_number,
          c.group_code,
          c.printed_code,
        ],
      );
    }
  });

  kv.set(KvKey.catalogVersion, String(data.catalog_version));
  kv.set('catalog.generatedAt', data.generated_at);

  return data.catalog_version;
}

/** Inspect counts in the seeded tables — useful for diagnostics. */
export async function catalogCounts() {
  const db = await getDatabase();
  const [{ n: cromosCount = 0 } = { n: 0 }] = (await db.getAllAsync<{ n: number }>(
    'SELECT count(*) AS n FROM catalog_cromos_local',
  )) as Array<{ n: number }>;
  const [{ n: countriesCount = 0 } = { n: 0 }] = (await db.getAllAsync<{ n: number }>(
    'SELECT count(*) AS n FROM countries_local',
  )) as Array<{ n: number }>;
  return { cromos: cromosCount, countries: countriesCount };
}

export type { CatalogBundle, CatalogCromoLocal };
