import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Text, Button } from '@/shared/ui';
import { useSetInventory } from '@/features/album/data/mutations';
import type { AlbumItem } from '@/features/album/lib/album';

type Props = {
  item: AlbumItem | null;
  userId: string | undefined;
  onClose: () => void;
};

export function CromoSheet({ item, userId, onClose }: Props) {
  const ref = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['52%'], []);
  const setInventory = useSetInventory();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (item) {
      setCount(item.ownedQuantity);
      ref.current?.expand();
    } else {
      ref.current?.close();
    }
  }, [item]);

  const handleChange = useCallback(
    (index: number) => {
      if (index < 0) onClose();
    },
    [onClose],
  );

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />
    ),
    [],
  );

  const save = useCallback(async () => {
    if (!item?.id || !userId) return;
    await setInventory.mutateAsync({
      userId,
      cromoId: item.id,
      ownedQuantity: count,
      pastedQuantity: item.pastedQuantity,
    });
    onClose();
  }, [count, item, userId, setInventory, onClose]);

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
      <BottomSheetView className="px-6 pb-8 pt-2">
        {item ? (
          <View className="gap-5">
            <View className="flex-row items-center gap-3">
              <View
                style={{ backgroundColor: item.accent ?? '#15140F' }}
                className="h-12 w-12 items-center justify-center rounded-2xl"
              >
                <Text className="text-base font-bold text-cream">
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
              <Text className="text-2xl">{item.flag_emoji}</Text>
            </View>

            <View className="rounded-2xl border border-ink-100 bg-cream-100 p-5">
              <Text className="text-xs uppercase tracking-widest text-ink-500">¿Cuántos tenés?</Text>
              <View className="mt-4 flex-row items-center justify-between">
                <Pressable
                  onPress={() => setCount((c) => Math.max(0, c - 1))}
                  className="h-12 w-12 items-center justify-center rounded-full border border-ink-100 bg-white active:bg-cream-200"
                >
                  <Text className="text-2xl font-bold text-ink-900">−</Text>
                </Pressable>
                <Text className="text-5xl font-extrabold text-ink-900">{count}</Text>
                <Pressable
                  onPress={() => setCount((c) => c + 1)}
                  className="h-12 w-12 items-center justify-center rounded-full bg-ink-900 active:bg-ink-800"
                >
                  <Text className="text-2xl font-bold text-cream">+</Text>
                </Pressable>
              </View>
              <View className="mt-4 flex-row items-center justify-center gap-2">
                <Text className="text-sm text-ink-500">
                  {count === 0
                    ? 'Te falta'
                    : count === 1
                      ? 'Lo tenés'
                      : `Tenés ${count - 1} repetido${count - 1 === 1 ? '' : 's'}`}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-2">
              <Button label="Cancelar" variant="secondary" className="flex-1" onPress={onClose} />
              <Button
                label="Guardar"
                variant="primary"
                className="flex-1"
                loading={setInventory.isPending}
                onPress={save}
              />
            </View>
          </View>
        ) : null}
      </BottomSheetView>
    </BottomSheet>
  );
}
