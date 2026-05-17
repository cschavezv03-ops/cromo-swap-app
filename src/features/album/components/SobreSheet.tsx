import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useQuery } from '@tanstack/react-query';
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { cn } from '@/shared/utils/cn';
import { Button, FlagDot, Sheet, useToast } from '@/ui';
import { useTheme } from '@/theme/ThemeProvider';
import {
  getDatabase,
  type CatalogCromoLocal,
  type CountryLocal,
} from '@/features/storage/db';

import { loadAllCountries } from '../data/catalog';
import { useBulkAddSobre } from '../hooks/useInventoryMutation';
import { catalogMatchesQuery, normalize } from '../lib/search';
import { SearchBar } from './SearchBar';

export type SobreSheetHandle = {
  present: () => void;
};

type Mode = 'country' | 'code';

const CARD_GAP = 8;
const COLS = 4;

export const SobreSheet = forwardRef<SobreSheetHandle>(function SobreSheet(_, ref) {
  const toast = useToast();
  const inner = useRef<BottomSheetModal>(null);
  const bulk = useBulkAddSobre();

  const [mode, setMode] = useState<Mode>('country');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [tally, setTally] = useState<Record<string, number>>({});
  const [rawCode, setRawCode] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  useImperativeHandle(ref, () => ({
    present: () => {
      setMode('country');
      setSelectedCountry(null);
      setTally({});
      setRawCode('');
      setSearch('');
      inner.current?.present();
    },
  }));

  const countries = useQuery({
    queryKey: ['album', 'countries'],
    queryFn: loadAllCountries,
    staleTime: 1000 * 60 * 60,
  });

  // Auto-select primer país cuando llegan los datos.
  useMemo(() => {
    if (!selectedCountry && countries.data && countries.data.length > 0) {
      const first = countries.data[0];
      if (first) setSelectedCountry(first.code);
    }
  }, [countries.data, selectedCountry]);

  const totalSelected = useMemo(
    () => Object.values(tally).reduce((s, n) => s + n, 0),
    [tally],
  );

  const incTally = (cromoId: string) =>
    setTally((prev) => ({ ...prev, [cromoId]: (prev[cromoId] ?? 0) + 1 }));

  const decTally = (cromoId: string) =>
    setTally((prev) => {
      const next = (prev[cromoId] ?? 0) - 1;
      const out = { ...prev };
      if (next <= 0) delete out[cromoId];
      else out[cromoId] = next;
      return out;
    });

  const handleSubmitCountry = async () => {
    const pairs = Object.entries(tally).map(([cromo_id, count]) => ({ cromo_id, count }));
    if (pairs.length === 0) return;
    setBusy(true);
    try {
      const added = await bulk.mutateAsync(pairs);
      toast.show(`Se agregaron ${added} cromos.`, 'success');
      inner.current?.dismiss();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Error agregando sobre.', 'danger');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitCode = async () => {
    const tokens = parseCodeTokens(rawCode);
    if (tokens.length === 0) return;
    setBusy(true);
    try {
      const db = await getDatabase();
      const pairs: Array<{ cromo_id: string; count: number }> = [];
      for (const t of tokens) {
        const row = await db.getFirstAsync<CatalogCromoLocal>(
          `SELECT * FROM catalog_cromos_local WHERE section_number = ? LIMIT 1`,
          [t.number],
        );
        if (!row) continue;
        const existing = pairs.find((p) => p.cromo_id === row.id);
        if (existing) existing.count += t.count;
        else pairs.push({ cromo_id: row.id, count: t.count });
      }
      if (pairs.length === 0) {
        toast.show('No encontramos esos números en el álbum.', 'warning');
        setBusy(false);
        return;
      }
      const added = await bulk.mutateAsync(pairs);
      toast.show(`Se agregaron ${added} cromos.`, 'success');
      inner.current?.dismiss();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Error agregando sobre.', 'danger');
    } finally {
      setBusy(false);
    }
  };

  const codeTotal = useMemo(
    () => parseCodeTokens(rawCode).reduce((s, t) => s + t.count, 0),
    [rawCode],
  );

  return (
    <Sheet ref={inner} snapPoints={['85%', '95%']}>
      <View style={{ flex: 1 }}>
        <Text className="text-2xl font-sans-black text-text-primary">Abrir sobre</Text>
        <Text className="mt-1 text-sm text-text-secondary font-sans">
          {mode === 'country'
            ? 'Selecciona el país y toca los cromos que salieron del sobre.'
            : 'Escribe los números separados por coma o espacio. Usa ×N para repetidos.'}
        </Text>

        <View className="mt-4 flex-row gap-2 self-start rounded-pill bg-surface p-1">
          <TabPill label="Por país" active={mode === 'country'} onPress={() => setMode('country')} />
          <TabPill label="Por código" active={mode === 'code'} onPress={() => setMode('code')} />
        </View>

        {mode === 'country' ? (
          <CountryMode
            countries={countries.data ?? []}
            selectedCountry={selectedCountry}
            onSelectCountry={setSelectedCountry}
            tally={tally}
            onInc={incTally}
            onDec={decTally}
            search={search}
            onSearchChange={setSearch}
          />
        ) : (
          <CodeMode rawCode={rawCode} setRawCode={setRawCode} />
        )}

        <View style={{ paddingTop: 12 }}>
          {mode === 'country' ? (
            <Button
              label={
                totalSelected === 0
                  ? 'Selecciona al menos un cromo'
                  : `Agregar ${totalSelected} cromo${totalSelected > 1 ? 's' : ''}`
              }
              size="lg"
              loading={busy || bulk.isPending}
              disabled={totalSelected === 0 || busy}
              onPress={handleSubmitCountry}
            />
          ) : (
            <Button
              label={
                codeTotal === 0
                  ? 'Escribe los números'
                  : `Agregar ${codeTotal} cromo${codeTotal > 1 ? 's' : ''}`
              }
              size="lg"
              loading={busy || bulk.isPending}
              disabled={codeTotal === 0 || busy}
              onPress={handleSubmitCode}
            />
          )}
        </View>
      </View>
    </Sheet>
  );
});

function TabPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'px-4 py-2 rounded-pill',
        active ? 'bg-text-primary' : 'bg-transparent',
      )}
    >
      <Text
        className={cn(
          'text-xs font-sans-semibold',
          active ? 'text-bg' : 'text-text-secondary',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type CountryModeProps = {
  countries: CountryLocal[];
  selectedCountry: string | null;
  onSelectCountry: (code: string) => void;
  tally: Record<string, number>;
  onInc: (cromoId: string) => void;
  onDec: (cromoId: string) => void;
  search: string;
  onSearchChange: (q: string) => void;
};

function CountryMode({
  countries,
  selectedCountry,
  onSelectCountry,
  tally,
  onInc,
  onDec,
  search,
  onSearchChange,
}: CountryModeProps) {
  const hasSearch = normalize(search).length > 0;

  // Cromos del país seleccionado (cuando NO hay búsqueda).
  const byCountry = useQuery({
    queryKey: ['album', 'cromosByCountry', selectedCountry ?? ''],
    enabled: Boolean(selectedCountry) && !hasSearch,
    queryFn: async () => {
      if (!selectedCountry) return [];
      const db = await getDatabase();
      return db.getAllAsync<CatalogCromoLocal>(
        `SELECT * FROM catalog_cromos_local WHERE country_code = ? ORDER BY section_number ASC`,
        [selectedCountry],
      );
    },
    staleTime: 1000 * 60 * 60,
  });

  // Catálogo completo en cache (lo cargamos una sola vez cuando hay búsqueda).
  const allCromos = useQuery({
    queryKey: ['album', 'cromosAll'],
    enabled: hasSearch,
    queryFn: async () => {
      const db = await getDatabase();
      return db.getAllAsync<CatalogCromoLocal>(
        `SELECT * FROM catalog_cromos_local ORDER BY section_code, section_number ASC`,
      );
    },
    staleTime: 1000 * 60 * 60,
  });

  const countryByCode = useMemo(() => {
    const m = new Map<string, CountryLocal>();
    for (const c of countries) m.set(c.code, c);
    return m;
  }, [countries]);

  // Lista visible: si hay búsqueda, filtramos el catálogo completo (limit 200).
  // Si no, mostramos los del país seleccionado.
  const visibleCromos = useMemo<CatalogCromoLocal[]>(() => {
    if (hasSearch) {
      const all = allCromos.data ?? [];
      const out: CatalogCromoLocal[] = [];
      for (const c of all) {
        const countryName = c.country_code ? countryByCode.get(c.country_code)?.name : undefined;
        if (catalogMatchesQuery(c, search, countryName)) {
          out.push(c);
          if (out.length >= 200) break;
        }
      }
      return out;
    }
    return byCountry.data ?? [];
  }, [hasSearch, allCromos.data, byCountry.data, search, countryByCode]);

  const cardWidth = useMemo(() => {
    const w = Dimensions.get('window').width - 40 - CARD_GAP * (COLS - 1);
    return Math.floor(w / COLS);
  }, []);

  const countryMeta = countries.find((c) => c.code === selectedCountry) ?? null;

  return (
    <View style={{ flex: 1, marginTop: 12 }}>
      <SearchBar value={search} onChange={onSearchChange} compact placeholder="Buscar jugador, país o número…" />

      {!hasSearch && (
        <View style={{ marginTop: 12 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
          >
            {countries.map((c) => {
              const isOn = c.code === selectedCountry;
              return (
                <Pressable
                  key={c.code}
                  onPress={() => onSelectCountry(c.code)}
                  className={cn(
                    'flex-row items-center gap-1.5 px-3 h-9 rounded-pill',
                    isOn ? 'bg-text-primary' : 'bg-surface',
                  )}
                >
                  <FlagDot code={c.code} color={c.stripe} accentColor={c.accent} size="sm" />
                  <Text
                    className={cn(
                      'text-xs font-sans-semibold',
                      isOn ? 'text-bg' : 'text-text-secondary',
                    )}
                  >
                    {c.code}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {countryMeta && (
            <View className="mt-4 flex-row items-center gap-2">
              <Text className="text-2xl">{countryMeta.flag_emoji}</Text>
              <Text className="text-base font-sans-bold text-text-primary">{countryMeta.name}</Text>
            </View>
          )}
        </View>
      )}

      {hasSearch && (
        <View style={{ marginTop: 10 }}>
          <Text className="text-xs font-sans-medium text-text-tertiary">
            {visibleCromos.length === 0
              ? `Sin resultados para "${search.trim()}".`
              : `${visibleCromos.length} resultado${visibleCromos.length === 1 ? '' : 's'}`}
          </Text>
        </View>
      )}

      <BottomSheetScrollView
        contentContainerStyle={{
          paddingTop: 12,
          paddingBottom: 16,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: CARD_GAP,
        }}
      >
        {visibleCromos.map((c) => {
          const count = tally[c.id] ?? 0;
          const stripe = c.country_code
            ? (countryByCode.get(c.country_code)?.stripe ?? '#9CA3AF')
            : '#9CA3AF';
          return (
            <CromoTallyCard
              key={c.id}
              cromo={c}
              count={count}
              stripe={stripe}
              width={cardWidth}
              onPress={() => onInc(c.id)}
              onLongPress={() => count > 0 && onDec(c.id)}
            />
          );
        })}
      </BottomSheetScrollView>
    </View>
  );
}

function CromoTallyCard({
  cromo,
  count,
  stripe,
  width,
  onPress,
  onLongPress,
}: {
  cromo: CatalogCromoLocal;
  count: number;
  stripe: string;
  width: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { colors } = useTheme();
  const isOn = count > 0;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={{
        width,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: isOn ? colors.surfaceElev : colors.surface,
        borderWidth: isOn ? 1 : StyleSheet.hairlineWidth,
        borderColor: isOn ? colors.accent : colors.border,
      }}
    >
      <View style={{ height: 4, backgroundColor: stripe }} />
      <View style={{ padding: 8, minHeight: 96 }}>
        <Text className="text-[10px] font-sans-semibold text-text-tertiary">
          {cromo.printed_code}
        </Text>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
          <Text className="font-mono text-text-primary" style={{ fontSize: 22, lineHeight: 26 }}>
            {cromo.jersey ?? cromo.section_number}
          </Text>
        </View>
        <Text
          className="text-center text-[10px] font-sans-semibold text-text-primary"
          numberOfLines={1}
        >
          {cromo.player_name ?? cromo.display_name}
        </Text>
      </View>
      {isOn && (
        <View
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            height: 22,
            minWidth: 22,
            paddingHorizontal: 5,
            borderRadius: 11,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text className="font-sans-bold text-bg" style={{ fontSize: 11 }}>
            ×{count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function CodeMode({
  rawCode,
  setRawCode,
}: {
  rawCode: string;
  setRawCode: (v: string) => void;
}) {
  const tokens = parseCodeTokens(rawCode);

  return (
    <View style={{ marginTop: 16 }}>
      <View className="rounded-lg border border-border bg-surface px-3 py-2">
        <BottomSheetTextInput
          value={rawCode}
          onChangeText={setRawCode}
          placeholder="12, 18, 18, 44, 102×2, 145"
          placeholderTextColor="#A1A1A9"
          keyboardType="numbers-and-punctuation"
          autoCorrect={false}
          multiline
          style={{
            minHeight: 96,
            fontSize: 16,
            color: '#0B0B0E',
            fontFamily: 'JetBrainsMono_700Bold',
          }}
        />
      </View>

      {tokens.length > 0 && (
        <View className="mt-4 flex-row flex-wrap gap-2">
          {tokens.map((t, i) => (
            <View
              key={`${t.number}-${i}`}
              className="rounded-md bg-accent-soft px-3 py-1.5"
            >
              <Text className="text-sm font-sans-semibold text-accent">
                #{t.number}
                {t.count > 1 ? ` ×${t.count}` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function parseCodeTokens(raw: string): Array<{ number: number; count: number }> {
  const out: Array<{ number: number; count: number }> = [];
  const pieces = raw.split(/[\s,]+/).filter(Boolean);
  for (const p of pieces) {
    const m = p.match(/^(\d{1,4})(?:[xX×](\d{1,2}))?$/);
    if (!m) continue;
    const numStr = m[1] ?? '';
    const num = parseInt(numStr, 10);
    const count = m[2] ? Math.max(1, parseInt(m[2], 10)) : 1;
    if (!Number.isFinite(num)) continue;
    const existing = out.find((t) => t.number === num);
    if (existing) existing.count += count;
    else out.push({ number: num, count });
  }
  return out;
}
