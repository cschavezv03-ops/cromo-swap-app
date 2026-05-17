import { getDatabase, type CatalogCromoLocal, type CountryLocal, type RarityLocal, type UniversityLocal } from './db';
import { kv, KvKey } from './kv';

// Bundled catalog JSON — generado del scrape real. Importado por Metro.
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

// SQLite limita ~32k bind variables por statement. 15 cols × 50 rows = 750 params: bien dentro.
const CROMO_BATCH = 50;
const CROMO_COLS = 15;

/**
 * Carga el catálogo bundleado en SQLite local. Idempotente: si la versión
 * local ya está al día, no hace nada.
 *
 * Performance: usa multi-row VALUES ((..),(..),...) para hacer N/batch
 * round-trips en lugar de N. Con 992 cromos pasa de ~3s a ~150ms en el
 * primer arranque.
 */
export async function ensureCatalogSeeded(): Promise<number> {
  const db = await getDatabase();
  const localVersion = Number(kv.getString(KvKey.catalogVersion) ?? '0');

  if (localVersion >= data.catalog_version) {
    return localVersion;
  }

  await db.withExclusiveTransactionAsync(async (tx) => {
    // Reset reference tables (countries/rarities/universities) — pueden cambiar
    // entre versiones. Catálogo se UPSERTea para no romper FK del inventory.
    await tx.execAsync(`
      DELETE FROM countries_local;
      DELETE FROM rarities_local;
      DELETE FROM universities_local;
    `);

    // Países, rarezas y universidades son pocos (~50, 6, 8) — single batch.
    if (data.countries.length > 0) {
      const ph = data.countries.map(() => '(?,?,?,?,?,?)').join(',');
      const params: (string | number | null)[] = [];
      for (const c of data.countries) {
        params.push(c.code, c.name, c.flag_emoji, c.stripe, c.accent, c.group_code);
      }
      await tx.runAsync(
        `INSERT INTO countries_local (code, name, flag_emoji, stripe, accent, group_code) VALUES ${ph}`,
        params,
      );
    }

    if (data.rarities.length > 0) {
      const ph = data.rarities.map(() => '(?,?,?,?,?,?)').join(',');
      const params: (string | number | null)[] = [];
      for (const r of data.rarities) {
        params.push(r.id, r.label, r.sort_order, r.chip_color, r.text_color, r.dot_color);
      }
      await tx.runAsync(
        `INSERT INTO rarities_local (id, label, sort_order, chip_color, text_color, dot_color) VALUES ${ph}`,
        params,
      );
    }

    if (data.universities.length > 0) {
      const ph = data.universities.map(() => '(?,?,?,?,?)').join(',');
      const params: (string | number | null)[] = [];
      for (const u of data.universities) {
        params.push(u.id, u.name, u.short, u.color, u.email_domain);
      }
      await tx.runAsync(
        `INSERT INTO universities_local (id, name, short, color, email_domain) VALUES ${ph}`,
        params,
      );
    }

    // Catálogo: batches de 50 cromos por INSERT (15 cols × 50 = 750 binds).
    const cols = `(id, catalog_version, section_code, section_number, country_code,
                   rarity_id, jersey, player_name, display_name, position,
                   sticker_type, is_special, page_number, group_code, printed_code)`;
    const rowPlaceholder = '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';

    for (let i = 0; i < data.cromos.length; i += CROMO_BATCH) {
      const slice = data.cromos.slice(i, i + CROMO_BATCH);
      const ph = slice.map(() => rowPlaceholder).join(',');
      const params: (string | number | null)[] = new Array(slice.length * CROMO_COLS);
      let p = 0;
      for (const c of slice) {
        params[p++] = c.id;
        params[p++] = c.catalog_version;
        params[p++] = c.section_code;
        params[p++] = c.section_number;
        params[p++] = c.country_code;
        params[p++] = c.rarity_id;
        params[p++] = c.jersey;
        params[p++] = c.player_name;
        params[p++] = c.display_name;
        params[p++] = c.position;
        params[p++] = c.sticker_type;
        params[p++] = c.is_special;
        params[p++] = c.page_number;
        params[p++] = c.group_code;
        params[p++] = c.printed_code;
      }
      await tx.runAsync(
        `INSERT OR REPLACE INTO catalog_cromos_local ${cols} VALUES ${ph}`,
        params,
      );
    }
  });

  kv.set(KvKey.catalogVersion, String(data.catalog_version));
  kv.set('catalog.generatedAt', data.generated_at);

  return data.catalog_version;
}

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
