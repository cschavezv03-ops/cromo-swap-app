import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { cn } from '@/shared/utils/cn';
import { Sheet } from '@/ui';

import { useAlbumData } from '../hooks/useAlbumData';
import { useDecrementOwned, useIncrementOwned } from '../hooks/useInventoryMutation';
import type { AlbumCromo, CountryMeta } from '../lib/types';

export type CromoSheetHandle = {
  present: (cromo: AlbumCromo, country: CountryMeta | null) => void;
  dismiss: () => void;
};

export const CromoSheet = forwardRef<CromoSheetHandle>(function CromoSheet(_, ref) {
  const inner = useRef<BottomSheetModal>(null);
  const [cromoId, setCromoId] = useState<string | null>(null);
  const [country, setCountry] = useState<CountryMeta | null>(null);

  const inc = useIncrementOwned();
  const dec = useDecrementOwned();
  const { data: album } = useAlbumData();

  // Buscar el cromo en el cache del álbum cada vez que cambia. Así los
  // botones +/- actualizan inmediatamente la UI del sheet (antes el sheet
  // mostraba el snapshot inicial porque vivía en state local).
  const cromo = useMemo<AlbumCromo | null>(() => {
    if (!cromoId || !album) return null;
    for (const s of album.sections) {
      for (const c of s.cromos) {
        if (c.id === cromoId) return c;
      }
    }
    return null;
  }, [cromoId, album]);

  useImperativeHandle(ref, () => ({
    present: (c, ctry) => {
      setCromoId(c.id);
      setCountry(ctry);
      inner.current?.present();
    },
    dismiss: () => inner.current?.dismiss(),
  }));

  return (
    <Sheet ref={inner} snapPoints={['45%', '75%']}>
      {cromo && (
        <View>
          {country && (
            <View
              className="flex-row items-center gap-2 self-start rounded-pill px-3 py-1"
              style={{ backgroundColor: `${country.stripe}22` }}
            >
              <Text>{country.flag_emoji}</Text>
              <Text className="text-xs font-sans-semibold" style={{ color: country.accent }}>
                {country.name}
              </Text>
            </View>
          )}
          <Text className="mt-3 text-3xl font-sans-black text-text-primary">
            {cromo.player_name ?? cromo.display_name}
          </Text>
          <Text className="mt-1 text-sm text-text-secondary font-sans">
            {cromo.printed_code} · #{cromo.jersey ?? cromo.section_number}
            {cromo.position ? ` · ${cromo.position}` : ''}
          </Text>

          <View className="mt-6 rounded-lg bg-surface p-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-[11px] font-sans-semibold uppercase tracking-wider text-text-tertiary">
                  Cuántos tengo
                </Text>
                <Text className="mt-1 text-4xl font-sans-black text-text-primary">
                  {cromo.owned}
                </Text>
                <Text className="mt-1 text-xs font-sans-medium text-text-tertiary">
                  {labelFor(cromo.owned)}
                </Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={() => dec.mutate(cromo.id)}
                  disabled={cromo.owned === 0}
                  hitSlop={6}
                  className={cn(
                    'h-12 w-12 items-center justify-center rounded-pill',
                    cromo.owned === 0 ? 'bg-border opacity-50' : 'bg-surface-elev',
                  )}
                >
                  <Text className="text-2xl text-text-primary">−</Text>
                </Pressable>
                <Pressable
                  onPress={() => inc.mutate(cromo.id)}
                  hitSlop={6}
                  className="h-12 w-12 items-center justify-center rounded-pill bg-accent"
                >
                  <Text className="text-2xl text-white">+</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      )}
    </Sheet>
  );
});

function labelFor(owned: number): string {
  if (owned === 0) return 'Te falta';
  if (owned === 1) return 'En tu álbum';
  return `Repetido (${owned - 1} para intercambio)`;
}
