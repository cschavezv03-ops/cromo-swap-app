import * as SQLite from 'expo-sqlite';

const DB_NAME = 'cromo-swap.db';
const SCHEMA_VERSION = 1;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS catalog_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS countries_local (
  code TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  flag_emoji TEXT NOT NULL,
  stripe TEXT NOT NULL,
  accent TEXT NOT NULL,
  group_code TEXT
);

CREATE TABLE IF NOT EXISTS rarities_local (
  id TEXT PRIMARY KEY NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  chip_color TEXT NOT NULL,
  text_color TEXT NOT NULL,
  dot_color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS universities_local (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  short TEXT NOT NULL,
  color TEXT NOT NULL,
  email_domain TEXT
);

CREATE TABLE IF NOT EXISTS catalog_cromos_local (
  id TEXT PRIMARY KEY NOT NULL,
  catalog_version INTEGER NOT NULL,
  section_code TEXT NOT NULL,
  section_number INTEGER NOT NULL,
  country_code TEXT,
  rarity_id TEXT NOT NULL,
  jersey INTEGER,
  player_name TEXT,
  display_name TEXT NOT NULL,
  position TEXT,
  sticker_type TEXT NOT NULL,
  is_special INTEGER NOT NULL DEFAULT 0,
  page_number INTEGER,
  group_code TEXT,
  printed_code TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_catalog_country ON catalog_cromos_local(country_code);
CREATE INDEX IF NOT EXISTS idx_catalog_section ON catalog_cromos_local(section_code, section_number);

CREATE TABLE IF NOT EXISTS inventory_local (
  cromo_id TEXT PRIMARY KEY NOT NULL,
  owned_quantity INTEGER NOT NULL DEFAULT 0,
  pasted_quantity INTEGER NOT NULL DEFAULT 0,
  wanted_quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'missing',
  updated_at INTEGER NOT NULL,
  dirty INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cromo_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_at INTEGER,
  created_at INTEGER NOT NULL
);
`;

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = result?.user_version ?? 0;

  if (current < 1) {
    await db.execAsync(SCHEMA_V1);
    await db.execAsync(`PRAGMA user_version = 1`);
  }

  if (current > SCHEMA_VERSION && __DEV__) {
    // eslint-disable-next-line no-console
    console.warn(
      `[db] PRAGMA user_version=${current} is ahead of app SCHEMA_VERSION=${SCHEMA_VERSION}. App may need an update.`,
    );
  }
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync('PRAGMA foreign_keys = ON;');
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}

export async function resetDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM inventory_local;
    DELETE FROM sync_queue;
    DELETE FROM catalog_cromos_local;
    DELETE FROM countries_local;
    DELETE FROM rarities_local;
    DELETE FROM universities_local;
    DELETE FROM catalog_meta;
  `);
}

// Convenience type for the row shapes the app uses elsewhere.
export type CatalogCromoLocal = {
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
  is_special: 0 | 1;
  page_number: number | null;
  group_code: string | null;
  printed_code: string;
};

export type CountryLocal = {
  code: string;
  name: string;
  flag_emoji: string;
  stripe: string;
  accent: string;
  group_code: string | null;
};

export type RarityLocal = {
  id: string;
  label: string;
  sort_order: number;
  chip_color: string;
  text_color: string;
  dot_color: string;
};

export type UniversityLocal = {
  id: string;
  name: string;
  short: string;
  color: string;
  email_domain: string | null;
};

export type InventoryLocal = {
  cromo_id: string;
  owned_quantity: number;
  pasted_quantity: number;
  wanted_quantity: number;
  status: 'missing' | 'have' | 'repeated';
  updated_at: number;
  dirty: 0 | 1;
};

export type SyncQueueRow = {
  id: number;
  cromo_id: string;
  payload: string;
  attempts: number;
  next_retry_at: number | null;
  created_at: number;
};
