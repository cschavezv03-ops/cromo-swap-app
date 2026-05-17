import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { cn } from '@/shared/utils/cn';
import { Sheet, useToast } from '@/ui';

import { useAlbumData } from '../hooks/useAlbumData';
import {
  useDecrementOwned,
  useIncrementOwned,
  useSetOwned,
} from '../hooks/useInventoryMutation';
import type { AlbumCromo, CountryMeta } from '../lib/types';

import { SectionMark } from './SectionMark';

export type CromoSheetHandle = {
  present: (cromo: AlbumCromo, country: CountryMeta | null) => void;
  dismiss: () => void;
};

export const CromoSheet = forwardRef<CromoSheetHandle>(function CromoSheet(_, ref) {
  const toast = useToast();
  const inner = useRef<BottomSheetModal>(null);
  const [cromoId, setCromoId] = useState<string | null>(null);
  const [country, setCountry] = useState<CountryMeta | null>(null);

  const inc = useIncrementOwned();
  const dec = useDecrementOwned();
  const setOwned = useSetOwned();
  const { data: album } = useAlbumData();

  // Indexamos por id una sola vez por render del album; lookup en O(1) por sheet open.
  const byId = useMemo(() => {
    const m = new Map<string, AlbumCromo>();
    if (!album) return m;
    for (const s of album.sections) {
      for (const c of s.cromos) m.set(c.id, c);
    }
    return m;
  }, [album]);

  const cromo = cromoId ? (byId.get(cromoId) ?? null) : null;

  useImperativeHandle(ref, () => ({
    present: (c, ctry) => {
      setCromoId(c.id);
      setCountry(ctry);
      inner.current?.present();
    },
    dismiss: () => inner.current?.dismiss(),
  }));

  const handleRemoveAll = () => {
    if (!cromo || cromo.owned === 0) return;
    setOwned.mutate(
      { cromoId: cromo.id, owned: 0 },
      {
        onSuccess: () => {
          toast.show('Cromo eliminado de tu álbum.', 'info');
          inner.current?.dismiss();
        },
      },
    );
  };

  return (
    <Sheet ref={inner} snapPoints={['50%', '80%']}>
      {cromo && (
        <View>
          {country && (
            <View
              className="flex-row items-center gap-2 self-start rounded-pill px-3 py-1"
              style={{ backgroundColor: `${country.stripe}22` }}
            >
              <SectionMark country={country} size="sm" />
              <Text
                className="text-xs font-sans-semibold"
                style={{ color: country.stripe }}
              >
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

          {cromo.owned > 0 && (
            <Pressable
              onPress={handleRemoveAll}
              disabled={setOwned.isPending}
              className="mt-4 items-center py-3"
            >
              <Text className="text-sm font-sans-semibold text-danger">
                {setOwned.isPending ? 'Eliminando…' : 'Quitar del álbum'}
              </Text>
            </Pressable>
          )}
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
