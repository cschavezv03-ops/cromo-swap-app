import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { Button, Text } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useResetCromo, useSetInventory } from '@/features/album/data/mutations';
import type { AlbumItem } from '@/features/album/lib/album';

type Props = {
  item: AlbumItem | null;
  userId: string | undefined;
  onClose: () => void;
};

function Stepper({
  value,
  min = 0,
  max = 99,
  onChange,
  accent,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
  accent?: string;
}) {
  const dec = () => {
    Haptics.selectionAsync().catch(() => undefined);
    onChange(Math.max(min, value - 1));
  };
  const inc = () => {
    Haptics.selectionAsync().catch(() => undefined);
    onChange(Math.min(max, value + 1));
  };
  return (
    <View className="flex-row items-center justify-between">
      <Pressable
        onPress={dec}
        disabled={value <= min}
        className={cn(
          'h-12 w-12 items-center justify-center rounded-full border border-ink-100 bg-white active:bg-cream-200',
          value <= min && 'opacity-40',
        )}
      >
        <Text className="text-2xl font-bold text-ink-900">−</Text>
      </Pressable>
      <Text
        style={{ color: accent ?? '#15140F' }}
        className="text-5xl font-extrabold"
      >
        {value}
      </Text>
      <Pressable
        onPress={inc}
        disabled={value >= max}
        className={cn(
          'h-12 w-12 items-center justify-center rounded-full bg-ink-900 active:bg-ink-800',
          value >= max && 'opacity-40',
        )}
      >
        <Text className="text-2xl font-bold text-cream">+</Text>
      </Pressable>
    </View>
  );
}

export function CromoOptionsSheet({ item, userId, onClose }: Props) {
  const router = useRouter();
  const ref = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['78%'], []);

  const [owned, setOwned] = useState(0);
  const [pasted, setPasted] = useState(0);

  const setInventory = useSetInventory();
  const resetCromo = useResetCromo();

  useEffect(() => {
    if (item) {
      setOwned(item.ownedQuantity);
      setPasted(item.pastedQuantity);
      ref.current?.expand();
    } else {
      ref.current?.close();
    }
  }, [item]);

  // Pasted can never exceed owned.
  useEffect(() => {
    if (pasted > owned) setPasted(owned);
  }, [owned, pasted]);

  const handleChange = useCallback(
    (index: number) => {
      if (index < 0) onClose();
    },
    [onClose],
  );

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.45} />
    ),
    [],
  );

  const save = useCallback(async () => {
    if (!item?.id || !userId) return;
    await setInventory.mutateAsync({
      userId,
      cromoId: item.id,
      ownedQuantity: owned,
      pastedQuantity: pasted,
    });
    onClose();
  }, [item, userId, owned, pasted, setInventory, onClose]);

  const reset = useCallback(() => {
    if (!item?.id || !userId) return;
    Alert.alert('¿Eliminar este cromo?', 'Vuelve a quedar como faltante. Si lo agregaste por error, esto lo corrige.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await resetCromo.mutateAsync({ userId, cromoId: item.id! });
          onClose();
        },
      },
    ]);
  }, [item, userId, resetCromo, onClose]);

  const goToMarket = useCallback(() => {
    onClose();
    router.push('/(tabs)/mercado');
  }, [onClose, router]);

  if (!item) return null;

  const accent = item.accent ?? '#15140F';
  const repeatedExtra = Math.max(0, owned - pasted);

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={handleChange}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: '#FFFFFF' }}
      handleIndicatorStyle={{ backgroundColor: '#B8B3A6' }}
    >
      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, paddingTop: 4 }}>
        <View className="flex-row items-center gap-3">
          <View
            style={{ backgroundColor: accent }}
            className="h-14 w-14 items-center justify-center rounded-2xl"
          >
            <Text className="text-lg font-bold text-cream">
              {item.jersey ?? item.section_number ?? '?'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs uppercase tracking-widest text-ink-500">
              {item.country_name} · {item.printed_code}
            </Text>
            <Text className="text-xl font-bold text-ink-900" numberOfLines={1}>
              {item.player_name ?? item.display_name}
            </Text>
            {item.position ? (
              <Text className="text-sm text-ink-500">{item.position}</Text>
            ) : null}
          </View>
          <Text className="text-3xl">{item.flag_emoji}</Text>
        </View>

        <View className="mt-6 gap-3 rounded-2xl border border-ink-100 bg-cream-100 p-5">
          <View className="flex-row items-center justify-between">
            <Text variant="overline">¿Cuántos tenés?</Text>
            <Text variant="caption">total en mano</Text>
          </View>
          <Stepper value={owned} max={99} onChange={setOwned} accent={accent} />
          <Text variant="caption" className="text-center">
            {owned === 0
              ? 'Faltante'
              : owned === 1
                ? 'Lo tenés (sin repetidos)'
                : `${owned - 1} repetido${owned - 1 === 1 ? '' : 's'}`}
          </Text>
        </View>

        <View className="mt-3 gap-3 rounded-2xl border border-ink-100 bg-cream-100 p-5">
          <View className="flex-row items-center justify-between">
            <Text variant="overline">Pegados en el álbum</Text>
            <Text variant="caption">máx. {owned}</Text>
          </View>
          <Stepper value={pasted} max={owned} onChange={setPasted} accent={accent} />
        </View>

        {repeatedExtra > 1 ? (
          <View className="mt-3 rounded-2xl border border-ink-100 bg-cream-100 p-5">
            <Text variant="overline">Repetidos para repartir</Text>
            <Text variant="body" className="mt-2 font-semibold">
              {repeatedExtra - 1} disponibles
            </Text>
            <View className="mt-3 gap-2">
              <Button label="Ofrecer intercambio" variant="secondary" onPress={goToMarket} />
              <Button label="Publicar venta" variant="secondary" onPress={goToMarket} />
              <Button label="Iniciar subasta" variant="secondary" onPress={goToMarket} />
            </View>
            <Text variant="caption" className="mt-2">
              Próximamente: configurás cuántos ofrecer, precio o duración de subasta. Por ahora te lleva al mercado.
            </Text>
          </View>
        ) : null}

        <View className="mt-4 flex-row gap-2">
          <Button label="Cancelar" variant="secondary" className="flex-1" onPress={onClose} />
          <Button
            label="Guardar"
            variant="primary"
            className="flex-1"
            loading={setInventory.isPending}
            onPress={save}
          />
        </View>

        {owned > 0 ? (
          <Pressable onPress={reset} className="mt-5 self-center px-4 py-2">
            <Text className="text-sm font-semibold text-danger">Eliminar este cromo</Text>
          </Pressable>
        ) : null}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
