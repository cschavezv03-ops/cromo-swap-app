import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { cn } from '@/shared/utils/cn';
import { Button, Sheet } from '@/ui';

import {
  useDecrementOwned,
  useIncrementOwned,
  useMarkPasted,
} from '../hooks/useInventoryMutation';
import type { AlbumCromo, CountryMeta } from '../lib/types';

export type CromoSheetHandle = {
  present: (cromo: AlbumCromo, country: CountryMeta | null) => void;
  dismiss: () => void;
};

export const CromoSheet = forwardRef<CromoSheetHandle>(function CromoSheet(_, ref) {
  const inner = useRef<BottomSheetModal>(null);
  const [cromo, setCromo] = useState<AlbumCromo | null>(null);
  const [country, setCountry] = useState<CountryMeta | null>(null);

  const inc = useIncrementOwned();
  const dec = useDecrementOwned();
  const paste = useMarkPasted();

  useImperativeHandle(ref, () => ({
    present: (c, ctry) => {
      setCromo(c);
      setCountry(ctry);
      inner.current?.present();
    },
    dismiss: () => inner.current?.dismiss(),
  }));

  return (
    <Sheet ref={inner} snapPoints={['50%', '85%']}>
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
                <Text className="text-xs font-sans-semibold uppercase tracking-wider text-text-tertiary">
                  Tienes
                </Text>
                <Text className="text-3xl font-sans-black text-text-primary">{cromo.owned}</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={() => dec.mutate(cromo.id)}
                  disabled={cromo.owned === 0 || dec.isPending}
                  className={cn(
                    'h-12 w-12 items-center justify-center rounded-pill',
                    cromo.owned === 0 ? 'bg-border opacity-50' : 'bg-surface-elev',
                  )}
                >
                  <Text className="text-2xl text-text-primary">−</Text>
                </Pressable>
                <Pressable
                  onPress={() => inc.mutate(cromo.id)}
                  disabled={inc.isPending}
                  className="h-12 w-12 items-center justify-center rounded-pill bg-accent"
                >
                  <Text className="text-2xl text-white">+</Text>
                </Pressable>
              </View>
            </View>
            <View className="mt-3 flex-row gap-4">
              <Text className="text-xs font-sans-medium text-text-tertiary">
                Pegados: <Text className="text-text-primary">{cromo.pasted}</Text>
              </Text>
              <Text className="text-xs font-sans-medium text-text-tertiary">
                Estado:{' '}
                <Text className="text-text-primary">{statusLabel(cromo.status, cromo.owned, cromo.pasted)}</Text>
              </Text>
            </View>
          </View>

          <View className="mt-4 gap-2">
            <Button
              label="Marcar uno como pegado"
              variant="secondary"
              loading={paste.isPending}
              disabled={cromo.owned === 0 || paste.isPending}
              onPress={() => paste.mutate(cromo.id)}
            />
          </View>
        </View>
      )}
    </Sheet>
  );
});

function statusLabel(
  status: AlbumCromo['status'],
  owned: number,
  pasted: number,
): string {
  if (status === 'missing') return 'Te falta';
  if (status === 'repeated') return `Repetido (${owned - pasted})`;
  return 'En tu álbum';
}
