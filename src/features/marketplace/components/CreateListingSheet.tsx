import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useProfile } from '@/features/auth/hooks/useProfile';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Chip, Input, Sheet, useToast } from '@/ui';

import {
  useCreateAuctionListing,
  useCreatePackageListing,
  useCreateSaleListing,
} from '../hooks/useListings';
import { useSellableInventory, type SellableCromo } from '../hooks/useSellableInventory';
import type { ListingKind } from '../data/listings';
import { formatUsd } from '../lib/time';

export type CreateListingSheetHandle = {
  present: () => void;
  dismiss: () => void;
};

type Props = {
  onCreated?: (listingId: string) => void;
};

type Step = 'kind' | 'cromos' | 'price';

const DURATION_PRESETS: { hours: number; label: string }[] = [
  { hours: 6, label: '6h' },
  { hours: 24, label: '1d' },
  { hours: 72, label: '3d' },
  { hours: 168, label: '7d' },
];

export const CreateListingSheet = forwardRef<CreateListingSheetHandle, Props>(
  function CreateListingSheet({ onCreated }, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const toast = useToast();
    const { colors } = useTheme();

    const profile = useProfile();
    const sellable = useSellableInventory();
    const saleMut = useCreateSaleListing();
    const packageMut = useCreatePackageListing();
    const auctionMut = useCreateAuctionListing();

    const [step, setStep] = useState<Step>('kind');
    const [kind, setKind] = useState<ListingKind>('sale');
    const [picked, setPicked] = useState<Record<string, number>>({}); // cromo_id -> quantity
    const [priceText, setPriceText] = useState('');
    const [bidIncrementText, setBidIncrementText] = useState('1');
    const [buyNowText, setBuyNowText] = useState('');
    const [durationHours, setDurationHours] = useState<number>(24);
    const [negotiable, setNegotiable] = useState(false);
    const [isPublic, setIsPublic] = useState(true);
    const [description, setDescription] = useState('');

    const reset = () => {
      setStep('kind');
      setKind('sale');
      setPicked({});
      setPriceText('');
      setBidIncrementText('1');
      setBuyNowText('');
      setDurationHours(24);
      setNegotiable(false);
      setIsPublic(true);
      setDescription('');
    };

    useImperativeHandle(ref, () => ({
      present: () => {
        reset();
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    const pickedItems = useMemo(() => {
      return Object.entries(picked).filter(([, q]) => q > 0);
    }, [picked]);

    const togglePick = (cromo: SellableCromo) => {
      setPicked((prev) => {
        const exists = prev[cromo.id];
        if (exists) {
          const { [cromo.id]: _omit, ...rest } = prev;
          return rest;
        }
        return { ...prev, [cromo.id]: 1 };
      });
    };

    const selectSingle = (cromo: SellableCromo) => {
      // Reemplaza la selección: solo este cromo queda elegido.
      setPicked({ [cromo.id]: 1 });
    };

    const clearPick = (cromoId: string) => {
      setPicked((prev) => {
        const { [cromoId]: _omit, ...rest } = prev;
        return rest;
      });
    };

    const changeQuantity = (id: string, max: number, delta: number) => {
      setPicked((prev) => {
        const cur = prev[id] ?? 0;
        const next = Math.max(1, Math.min(max, cur + delta));
        return { ...prev, [id]: next };
      });
    };

    const handleSubmit = async () => {
      const price = Number(priceText);
      if (!priceText || Number.isNaN(price) || price <= 0) {
        toast.show('Ingresa un precio mayor a 0.', 'warning');
        return;
      }
      const scopeUniversities = profile.data?.scope ?? [];

      try {
        let id: string;
        if (kind === 'sale') {
          const first = pickedItems[0];
          if (!first) throw new Error('Selecciona un cromo.');
          id = await saleMut.mutateAsync({
            cromoId: first[0],
            price,
            negotiable,
            isPublic,
            scopeUniversities,
            description: description.trim() || null,
          });
        } else if (kind === 'package') {
          id = await packageMut.mutateAsync({
            items: pickedItems.map(([cromo_id, quantity]) => ({ cromo_id, quantity })),
            price,
            negotiable,
            isPublic,
            scopeUniversities,
            description: description.trim() || null,
          });
        } else {
          const first = pickedItems[0];
          if (!first) throw new Error('Selecciona un cromo.');
          const increment = Number(bidIncrementText);
          const buyNow = buyNowText ? Number(buyNowText) : null;
          if (!Number.isFinite(increment) || increment <= 0) {
            toast.show('El incremento de la oferta debe ser mayor a 0.', 'warning');
            return;
          }
          if (buyNow !== null && (!Number.isFinite(buyNow) || buyNow <= price)) {
            toast.show('El precio "comprar ya" debe ser mayor al inicial.', 'warning');
            return;
          }
          id = await auctionMut.mutateAsync({
            cromoId: first[0],
            startPrice: price,
            durationHours,
            bidIncrement: increment,
            buyNowPrice: buyNow,
            isPublic,
            scopeUniversities,
            description: description.trim() || null,
          });
        }
        toast.show('Publicación creada.', 'success');
        sheetRef.current?.dismiss();
        onCreated?.(id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'No se pudo crear.';
        toast.show(messageForCreateError(msg), 'danger');
      }
    };

    const isSubmitting =
      saleMut.isPending || packageMut.isPending || auctionMut.isPending;

    const canGoToPrice = () => {
      if (kind === 'sale' || kind === 'auction') return pickedItems.length === 1;
      return pickedItems.length >= 1;
    };

    return (
      <Sheet ref={sheetRef} snapPoints={['92%']}>
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 12,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            }}
          >
            <Text className="text-xs font-sans-semibold uppercase tracking-wider text-text-tertiary">
              Paso {stepNumber(step)} de 3
            </Text>
            <Pressable
              onPress={() => sheetRef.current?.dismiss()}
              hitSlop={8}
            >
              <Text className="text-sm font-sans-medium text-text-secondary">Cerrar</Text>
            </Pressable>
          </View>

          <BottomSheetScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingVertical: 16, paddingBottom: 40 }}
          >
            {step === 'kind' && (
              <KindStep value={kind} onChange={setKind} />
            )}
            {step === 'cromos' && (
              <CromosStep
                kind={kind}
                items={sellable.data ?? []}
                isLoading={sellable.isLoading}
                picked={picked}
                onToggle={togglePick}
                onSelectSingle={selectSingle}
                onClear={clearPick}
                onChangeQuantity={changeQuantity}
              />
            )}
            {step === 'price' && (
              <PriceStep
                kind={kind}
                priceText={priceText}
                onPriceText={setPriceText}
                bidIncrementText={bidIncrementText}
                onBidIncrementText={setBidIncrementText}
                buyNowText={buyNowText}
                onBuyNowText={setBuyNowText}
                durationHours={durationHours}
                onDurationHours={setDurationHours}
                negotiable={negotiable}
                onNegotiable={setNegotiable}
                isPublic={isPublic}
                onIsPublic={setIsPublic}
                description={description}
                onDescription={setDescription}
              />
            )}
          </BottomSheetScrollView>

          <View
            style={{
              flexDirection: 'row',
              gap: 8,
              paddingTop: 12,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.border,
            }}
          >
            {step !== 'kind' && (
              <Button
                label="Atrás"
                variant="secondary"
                onPress={() =>
                  setStep((prev) => (prev === 'price' ? 'cromos' : 'kind'))
                }
                disabled={isSubmitting}
                className="flex-1"
              />
            )}
            {step === 'kind' && (
              <Button
                label="Siguiente"
                onPress={() => setStep('cromos')}
                className="flex-1"
              />
            )}
            {step === 'cromos' && (
              <Button
                label="Siguiente"
                onPress={() => setStep('price')}
                disabled={!canGoToPrice()}
                className="flex-1"
              />
            )}
            {step === 'price' && (
              <Button
                label="Publicar"
                onPress={handleSubmit}
                loading={isSubmitting}
                className="flex-1"
              />
            )}
          </View>
        </View>
      </Sheet>
    );
  },
);

function stepNumber(step: Step): number {
  if (step === 'kind') return 1;
  if (step === 'cromos') return 2;
  return 3;
}

function KindStep({
  value,
  onChange,
}: {
  value: ListingKind;
  onChange: (next: ListingKind) => void;
}) {
  return (
    <View className="gap-2">
      <Text className="text-2xl font-sans-black text-text-primary">¿Qué quieres publicar?</Text>
      <Text className="text-sm font-sans text-text-secondary">
        Elige el tipo de publicación. Lo podrás cambiar antes de confirmar.
      </Text>
      <View className="mt-4 gap-3">
        <KindOption
          active={value === 'sale'}
          title="Venta"
          description="Un cromo a un precio fijo."
          onPress={() => onChange('sale')}
        />
        <KindOption
          active={value === 'package'}
          title="Lote"
          description="Varios cromos en un solo paquete con precio único."
          onPress={() => onChange('package')}
        />
        <KindOption
          active={value === 'auction'}
          title="Subasta"
          description="Un cromo con precio inicial. La oferta más alta gana al cierre."
          onPress={() => onChange('auction')}
        />
      </View>
    </View>
  );
}

function KindOption({
  active,
  title,
  description,
  onPress,
}: {
  active: boolean;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        padding: 16,
        borderRadius: 12,
        borderWidth: active ? 2 : StyleSheet.hairlineWidth,
        borderColor: active ? '#0B0B0E' : '#E5E5EA',
      }}
    >
      <Text className="text-base font-sans-bold text-text-primary">{title}</Text>
      <Text className="mt-1 text-sm font-sans text-text-secondary">{description}</Text>
    </Pressable>
  );
}

function CromosStep({
  kind,
  items,
  isLoading,
  picked,
  onToggle,
  onSelectSingle,
  onClear,
  onChangeQuantity,
}: {
  kind: ListingKind;
  items: SellableCromo[];
  isLoading: boolean;
  picked: Record<string, number>;
  onToggle: (cromo: SellableCromo) => void;
  onSelectSingle: (cromo: SellableCromo) => void;
  onClear: (cromoId: string) => void;
  onChangeQuantity: (id: string, max: number, delta: number) => void;
}) {
  const isSingle = kind === 'sale' || kind === 'auction';

  return (
    <View className="gap-2">
      <Text className="text-2xl font-sans-black text-text-primary">
        {isSingle ? 'Elige un cromo' : 'Elige los cromos del lote'}
      </Text>
      <Text className="text-sm font-sans text-text-secondary">
        Solo puedes publicar cromos con 2 o más copias para no quedarte sin tu única.
      </Text>

      {isLoading ? (
        <Text className="mt-6 text-sm font-sans text-text-tertiary">Cargando tu inventario…</Text>
      ) : items.length === 0 ? (
        <Text className="mt-6 text-sm font-sans text-text-tertiary">
          Todavía no tienes cromos repetidos para vender.
        </Text>
      ) : (
        <View className="mt-2 gap-2">
          {items.map((c) => {
            const qty = picked[c.id] ?? 0;
            const selected = qty > 0;
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  if (isSingle) {
                    if (qty > 0) onClear(c.id);
                    else onSelectSingle(c);
                  } else {
                    onToggle(c);
                  }
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                  borderColor: selected ? '#0B0B0E' : '#E5E5EA',
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#F7F7F8',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text className="text-xs font-sans-bold text-text-primary">
                    {c.jersey ?? c.section_code}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} className="text-sm font-sans-semibold text-text-primary">
                    {c.player_name ?? c.display_name}
                  </Text>
                  <Text className="text-xs font-sans text-text-tertiary">
                    {c.printed_code} · tienes {c.owned}
                  </Text>
                </View>
                {!isSingle && selected && (
                  <View className="flex-row items-center gap-2">
                    <Pressable
                      onPress={() => onChangeQuantity(c.id, c.owned - 1, -1)}
                      hitSlop={8}
                    >
                      <Text className="text-xl font-sans-bold text-text-primary">−</Text>
                    </Pressable>
                    <Text className="min-w-6 text-center text-sm font-sans-bold text-text-primary">
                      {qty}
                    </Text>
                    <Pressable
                      onPress={() => onChangeQuantity(c.id, c.owned - 1, 1)}
                      hitSlop={8}
                    >
                      <Text className="text-xl font-sans-bold text-text-primary">+</Text>
                    </Pressable>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function PriceStep({
  kind,
  priceText,
  onPriceText,
  bidIncrementText,
  onBidIncrementText,
  buyNowText,
  onBuyNowText,
  durationHours,
  onDurationHours,
  negotiable,
  onNegotiable,
  isPublic,
  onIsPublic,
  description,
  onDescription,
}: {
  kind: ListingKind;
  priceText: string;
  onPriceText: (v: string) => void;
  bidIncrementText: string;
  onBidIncrementText: (v: string) => void;
  buyNowText: string;
  onBuyNowText: (v: string) => void;
  durationHours: number;
  onDurationHours: (h: number) => void;
  negotiable: boolean;
  onNegotiable: (b: boolean) => void;
  isPublic: boolean;
  onIsPublic: (b: boolean) => void;
  description: string;
  onDescription: (v: string) => void;
}) {
  return (
    <View className="gap-3">
      <Text className="text-2xl font-sans-black text-text-primary">Precio y opciones</Text>

      <Input
        label={kind === 'auction' ? 'Precio inicial (USD)' : 'Precio (USD)'}
        keyboardType="numeric"
        value={priceText}
        onChangeText={onPriceText}
        leftSlot={
          <Text className="mr-2 text-base font-sans-semibold text-text-secondary">$</Text>
        }
      />

      {kind === 'auction' && (
        <>
          <Input
            label="Incremento de oferta (USD)"
            keyboardType="numeric"
            value={bidIncrementText}
            onChangeText={onBidIncrementText}
            leftSlot={
              <Text className="mr-2 text-base font-sans-semibold text-text-secondary">$</Text>
            }
            helper="Cada oferta deberá superar a la actual al menos en este monto."
          />
          <Input
            label='Precio "comprar ya" (opcional)'
            keyboardType="numeric"
            value={buyNowText}
            onChangeText={onBuyNowText}
            leftSlot={
              <Text className="mr-2 text-base font-sans-semibold text-text-secondary">$</Text>
            }
          />
          <View className="mt-1">
            <Text className="mb-2 text-xs font-sans-medium uppercase tracking-wider text-text-tertiary">
              Duración
            </Text>
            <View className="flex-row gap-2">
              {DURATION_PRESETS.map((d) => (
                <Chip
                  key={d.hours}
                  label={d.label}
                  size="sm"
                  variant={durationHours === d.hours ? 'selected' : 'outline'}
                  onPress={() => onDurationHours(d.hours)}
                />
              ))}
            </View>
          </View>
        </>
      )}

      {(kind === 'sale' || kind === 'package') && (
        <ToggleRow
          label="Precio negociable"
          value={negotiable}
          onChange={onNegotiable}
        />
      )}
      <ToggleRow
        label="Público (todas las universidades)"
        value={isPublic}
        onChange={onIsPublic}
        helper={
          isPublic
            ? 'Cualquier usuario podrá ver y comprar esta publicación.'
            : 'Solo personas dentro de tu scope podrán verla.'
        }
      />
      <Input
        label="Descripción (opcional)"
        value={description}
        onChangeText={onDescription}
        multiline
        numberOfLines={3}
        placeholder="Notas sobre el estado, lugar de encuentro, etc."
      />

      {kind === 'auction' && priceText && (
        <Text className="mt-2 text-xs font-sans text-text-tertiary">
          La subasta se cerrará automáticamente y notificará al ganador. Precio inicial: {formatUsd(Number(priceText))}.
        </Text>
      )}
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  helper,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  helper?: string;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={{
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#E5E5EA',
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-sans-semibold text-text-primary">{label}</Text>
        <View
          style={{
            width: 44,
            height: 26,
            borderRadius: 13,
            backgroundColor: value ? '#0B0B0E' : '#E5E5EA',
            justifyContent: 'center',
            paddingHorizontal: 3,
          }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: '#FFFFFF',
              alignSelf: value ? 'flex-end' : 'flex-start',
            }}
          />
        </View>
      </View>
      {helper && (
        <Text className="mt-1 text-xs font-sans text-text-tertiary">{helper}</Text>
      )}
    </Pressable>
  );
}

function messageForCreateError(code: string): string {
  if (code.includes('cromo_already_listed'))
    return 'Este cromo ya tiene una publicación activa.';
  if (code.includes('not_owned')) return 'No tienes copias disponibles de ese cromo.';
  if (code.includes('auction_blocked'))
    return 'Estás bloqueado para subastas. Intenta más tarde.';
  if (code.includes('invalid_input')) return 'Revisa los datos del formulario.';
  return 'No se pudo crear la publicación.';
}
