import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Input, Sheet, useToast } from '@/ui';

import { usePlaceBid } from '../hooks/useBids';
import { formatUsd } from '../lib/time';

export type BidSheetHandle = {
  present: () => void;
  dismiss: () => void;
};

type Props = {
  listingId: string;
  currentBid: number | null;
  startPrice: number | null;
  bidsCount: number;
};

// Las subastas ahora aceptan cualquier monto > current_bid en al menos $0.01.
// El UI usa $0.25 como STEP de los botones +/- por usabilidad, pero el user
// puede tipear cualquier monto válido directamente.
const STEP = 0.25;
const MIN_INCREMENT = 0.01;

export const BidSheet = forwardRef<BidSheetHandle, Props>(function BidSheet(
  { listingId, currentBid, startPrice, bidsCount },
  ref,
) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const toast = useToast();
  const placeBidMut = usePlaceBid(listingId);

  const baseMin =
    bidsCount === 0
      ? startPrice ?? 1
      : (currentBid ?? startPrice ?? 0) + MIN_INCREMENT;
  const [amount, setAmount] = useState<number>(baseMin);

  useImperativeHandle(ref, () => ({
    present: () => {
      const nextMin =
        bidsCount === 0
          ? startPrice ?? 1
          : (currentBid ?? startPrice ?? 0) + MIN_INCREMENT;
      setAmount(nextMin);
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleStep = (dir: 1 | -1) => {
    setAmount((prev) => {
      const next = Math.max(baseMin, prev + dir * STEP);
      return Math.round(next * 100) / 100;
    });
  };

  const handleChangeText = (t: string) => {
    const cleaned = t.replace(/[^0-9.]/g, '');
    const n = Number(cleaned);
    if (Number.isNaN(n)) return;
    setAmount(n);
  };

  const handleSubmit = async () => {
    if (amount < baseMin) {
      toast.show(`La oferta mínima es ${formatUsd(baseMin)}.`, 'warning');
      return;
    }
    try {
      await placeBidMut.mutateAsync(amount);
      toast.show('Oferta enviada.', 'success');
      sheetRef.current?.dismiss();
    } catch (err) {
      const code = err instanceof Error ? err.message : 'unknown';
      toast.show(messageForBidError(code), 'danger');
    }
  };

  return (
    <Sheet ref={sheetRef} snapPoints={['55%']}>
      <View>
        <Text className="text-xs font-sans-semibold uppercase tracking-wider text-text-tertiary">
          Tu oferta
        </Text>
        <Text className="mt-1 text-2xl font-sans-black text-text-primary">
          Hacer una oferta
        </Text>
        <Text className="mt-2 text-sm font-sans text-text-secondary">
          Oferta mínima: {formatUsd(baseMin)}. Puedes ofertar cualquier monto mayor.
        </Text>

        <View className="mt-6 flex-row items-end gap-3">
          <Pressable
            onPress={() => handleStep(-1)}
            className="h-12 w-12 items-center justify-center rounded-md bg-surface"
            disabled={placeBidMut.isPending}
          >
            <Text className="text-2xl font-sans-bold text-text-primary">−</Text>
          </Pressable>
          <View className="flex-1">
            <Input
              keyboardType="numeric"
              value={String(amount)}
              onChangeText={handleChangeText}
              leftSlot={
                <Text className="mr-2 text-base font-sans-semibold text-text-secondary">$</Text>
              }
            />
          </View>
          <Pressable
            onPress={() => handleStep(1)}
            className="h-12 w-12 items-center justify-center rounded-md bg-surface"
            disabled={placeBidMut.isPending}
          >
            <Text className="text-2xl font-sans-bold text-text-primary">+</Text>
          </Pressable>
        </View>

        <View className="mt-6">
          <Button
            label={`Ofertar ${formatUsd(amount)}`}
            size="lg"
            loading={placeBidMut.isPending}
            disabled={placeBidMut.isPending || amount < baseMin}
            onPress={handleSubmit}
          />
        </View>
      </View>
    </Sheet>
  );
});

function messageForBidError(code: string): string {
  if (code.includes('bid_too_low')) return 'La oferta es menor al mínimo.';
  if (code.includes('auction_ended')) return 'La subasta ya terminó.';
  if (code.includes('auction_blocked'))
    return 'Estás bloqueado para subastas. Intenta de nuevo más tarde.';
  if (code.includes('not_available')) return 'La subasta ya no está disponible.';
  if (code.includes('self_bid')) return 'No puedes ofertar en tu propia subasta.';
  if (code.includes('out_of_scope')) return 'No tienes permiso para ver esta subasta.';
  return 'No se pudo registrar la oferta.';
}
