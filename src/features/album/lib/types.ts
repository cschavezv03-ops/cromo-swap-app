export type FilterTab = 'all' | 'missing' | 'repeated' | 'have';

export type CromoStatus = 'missing' | 'have' | 'repeated';

export type AlbumCromo = {
  id: string;
  section_code: string;
  section_number: number;
  printed_code: string;
  country_code: string | null;
  rarity_id: string;
  jersey: number | null;
  player_name: string | null;
  display_name: string;
  position: string | null;
  sticker_type: string;
  is_special: boolean;
  page_number: number | null;
  group_code: string | null;
  // Inventory state (joined)
  owned: number;
  pasted: number;
  wanted: number;
  status: CromoStatus;
  dirty: boolean;
};

export type CountryMeta = {
  code: string;
  name: string;
  stripe: string;
  accent: string;
  flag_emoji: string;
  /** Grupo del Mundial (A-L) o null si la sección no es un país. */
  group_code?: string | null;
};

export type CountrySectionData = {
  country: CountryMeta;
  cromos: AlbumCromo[];
  haveCount: number;
  totalCount: number;
};

export type AlbumStats = {
  total: number;
  have: number;
  missing: number;
  repeated: number;
};

export type AlbumData = {
  sections: CountrySectionData[];
  stats: AlbumStats;
};
