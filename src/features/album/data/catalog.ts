import { getDatabase, type CatalogCromoLocal, type CountryLocal } from '@/features/storage/db';

export async function loadAllCromos(): Promise<CatalogCromoLocal[]> {
  const db = await getDatabase();
  return db.getAllAsync<CatalogCromoLocal>(
    `SELECT * FROM catalog_cromos_local ORDER BY section_code ASC, section_number ASC`,
  );
}

export async function loadAllCountries(): Promise<CountryLocal[]> {
  const db = await getDatabase();
  return db.getAllAsync<CountryLocal>(
    `SELECT * FROM countries_local ORDER BY name ASC`,
  );
}

export async function loadCromoById(id: string): Promise<CatalogCromoLocal | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<CatalogCromoLocal>(
    `SELECT * FROM catalog_cromos_local WHERE id = ?`,
    [id],
  );
  return row ?? null;
}
