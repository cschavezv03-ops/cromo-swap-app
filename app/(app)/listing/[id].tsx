import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useProfile } from '@/features/auth/hooks/useProfile';
import { useSession } from '@/features/auth/hooks/useSession';
import { universitiesById } from '@/features/auth/lib/universities';
import { AuctionCountdown } from '@/features/marketplace/components/AuctionCountdown';
import {
  BidSheet,
  type BidSheetHandle,
} from '@/features/marketplace/components/BidSheet';
import { ListingPriceTag } from '@/features/marketplace/components/ListingPriceTag';
import { useBidsForListing } from '@/features/marketplace/hooks/useBids';
import {
  useCancelListing,
  useCloseAuction,
  useListingDetail,
  usePauseListing,
  useResumeListing,
} from '@/features/marketplace/hooks/useListings';
import { useListingDetailRealtime } from '@/features/marketplace/hooks/useMarketplaceRealtime';
import { useCreatePurchaseRequest } from '@/features/marketplace/hooks/usePurchase';
import type { ListingItem } from '@/features/marketplace/data/listings';
import { formatShortDate, formatUsd } from '@/features/marketplace/lib/time';
import {
  WhatsAppPrompt,
  type WhatsAppPromptHandle,
} from '@/features/profile/components/WhatsAppPrompt';
import { useMyWhatsApp } from '@/features/profile/hooks/useWhatsApp';
import { Button, Card, EmptyState, FlagDot, Screen, ScreenHeader, Skeleton, useToast } from '@/ui';

export default function ListingDetailScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useSession();
  const profile = useProfile();
  const myWhatsApp = useMyWhatsApp();
  const { id } = useLocalSearchParams<{ id: string }>();
  const listingId = Array.isArray(id) ? id[0] : id;

  const detail = useListingDetail(listingId);
  const bids = useBidsForListing(listingId);
  const cancelMut = useCancelListing();
  const pauseMut = usePauseListing();
  const resumeMut = useResumeListing();
  const closeMut = useCloseAuction();
  const purchaseMut = useCreatePurchaseRequest();

  useListingDetailRealtime(listingId);

  const bidSheet = useRef<BidSheetHandle>(null);
  const whatsappPrompt = useRef<WhatsAppPromptHandle>(null);

  const myId = user?.id ?? null;
  const tx = detail.data;
  const isSeller = tx?.seller_id === myId;
  const auctionEnded = useMemo(
    () => Boolean(tx?.ends_at && new Date(tx.ends_at).getTime() <= Date.now()),
    [tx?.ends_at],
  );

  // Cerrar subastas vencidas automáticamente al ver el detalle: solo lo
  // disparamos UNA vez (al detectar la condición) — el RPC es idempotente.
  const triggeredCloseRef = useRef(false);
  useEffect(() => {
    if (!listingId || !tx) return;
    if (tx.kind !== 'auction') return;
    if (tx.status !== 'active') return;
    if (!auctionEnded) return;
    if (triggeredCloseRef.current) return;
    triggeredCloseRef.current = true;
    void closeMut.mutateAsync(listingId).catch(() => {
      triggeredCloseRef.current = false;
    });
  }, [listingId, tx, auctionEnded, closeMut]);

  if (!listingId) {
    return (
      <Screen>
        <ScreenHeader title="Publicación" onBack={() => router.back()} />
        <EmptyState title="Publicación no encontrada" />
      </Screen>
    );
  }

  if (detail.isLoading) {
    return (
      <Screen>
        <ScreenHeader title="Publicación" onBack={() => router.back()} />
        <View className="gap-3 px-5">
          <Skeleton width="100%" height={180} rounded="md" />
          <Skeleton width="60%" height={20} rounded="sm" />
          <Skeleton width="100%" height={80} rounded="md" />
        </View>
      </Screen>
    );
  }

  if (!tx) {
    return (
      <Screen>
        <ScreenHeader title="Publicación" onBack={() => router.back()} />
        <EmptyState
          title="Publicación no encontrada"
          description="Quizá fue cancelada o ya no está visible para tu universidad."
        />
      </Screen>
    );
  }

  const seller = tx.seller;
  const uni = seller?.university ? universitiesById[seller.university] ?? null : null;
  const auctionBlockedUntil = profile.data?.auction_blocked_until ?? null;
  const isAuctionBlocked = Boolean(
    auctionBlockedUntil && new Date(auctionBlockedUntil).getTime() > Date.now(),
  );

  const totalItems = tx.items.reduce((acc, it) => acc + it.quantity, 0);

  const handleRequestPurchase = async () => {
    if (!myWhatsApp.data?.whatsapp_phone) {
      whatsappPrompt.current?.present({
        onComplete: () => {
          void doRequestPurchase();
        },
      });
      return;
    }
    await doRequestPurchase();
  };

  const doRequestPurchase = async () => {
    try {
      const txId = await purchaseMut.mutateAsync(listingId);
      toast.show('Solicitud enviada. Espera la aceptación del vendedor.', 'success');
      router.push({ pathname: '/(app)/transaction/[id]', params: { id: txId } });
    } catch (err) {
      toast.show(messageForPurchaseError(asMsg(err)), 'danger');
    }
  };

  const handleBid = () => {
    if (isAuctionBlocked) {
      toast.show(
        `Estás bloqueado para subastas hasta el ${formatShortDate(auctionBlockedUntil)}.`,
        'warning',
      );
      return;
    }
    bidSheet.current?.present();
  };

  const handlePause = async () => {
    try {
      await pauseMut.mutateAsync(listingId);
      toast.show('Publicación pausada.', 'info');
    } catch (err) {
      toast.show(messageForListingError(asMsg(err)), 'danger');
    }
  };

  const handleResume = async () => {
    try {
      await resumeMut.mutateAsync(listingId);
      toast.show('Publicación reactivada.', 'success');
    } catch (err) {
      toast.show(messageForListingError(asMsg(err)), 'danger');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMut.mutateAsync(listingId);
      toast.show('Publicación cancelada.', 'info');
      router.back();
    } catch (err) {
      toast.show(messageForListingError(asMsg(err)), 'danger');
    }
  };

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        eyebrow={labelForKind(tx.kind)}
        title={seller?.display_name ?? 'Publicación'}
        onBack={() => router.back()}
        rightSlot={
          uni ? (
            <View
              className="flex-row items-center gap-1.5 rounded-pill px-2.5 py-1"
              style={{ backgroundColor: `${uni.color}1A` }}
            >
              <View
                style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: uni.color }}
              />
              <Text className="text-[11px] font-sans-bold" style={{ color: uni.color }}>
                {uni.short}
              </Text>
            </View>
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        <Hero items={tx.items} kind={tx.kind} />

        <View className="mt-6 flex-row items-end justify-between">
          <ListingPriceTag listing={tx} large />
          {tx.kind === 'auction' && tx.ends_at && (
            <AuctionCountdown endsAt={tx.ends_at} className="text-sm" />
          )}
        </View>

        {tx.negotiable && (
          <Text className="mt-2 text-xs font-sans-semibold uppercase tracking-wider text-accent">
            Precio negociable
          </Text>
        )}

        {tx.description && (
          <View className="mt-6">
            <Text className="text-xs font-sans-semibold uppercase tracking-wider text-text-tertiary">
              Descripción
            </Text>
            <Text className="mt-2 text-base font-sans text-text-primary leading-6">
              {tx.description}
            </Text>
          </View>
        )}

        {tx.kind === 'package' && totalItems > 0 && (
          <View className="mt-6">
            <Text className="text-xs font-sans-semibold uppercase tracking-wider text-text-tertiary">
              {tx.items.length} cromos · {totalItems} unidades en total
            </Text>
          </View>
        )}

        {tx.kind === 'auction' && (
          <View className="mt-6">
            <Text className="mb-2 text-xs font-sans-semibold uppercase tracking-wider text-text-tertiary">
              Historial de ofertas
            </Text>
            {bids.isLoading ? (
              <Skeleton width="100%" height={56} rounded="md" />
            ) : (bids.data ?? []).length === 0 ? (
              <Text className="text-sm font-sans text-text-tertiary">
                Todavía no hay ofertas. Sé el primero.
              </Text>
            ) : (
              <View className="gap-2">
                {(bids.data ?? []).map((b, idx) => (
                  <View
                    key={b.id}
                    className="flex-row items-center justify-between rounded-md bg-surface p-3"
                  >
                    <View>
                      <Text className="text-sm font-sans-semibold text-text-primary">
                        {idx === 0 ? '🏆 ' : ''}
                        {b.bidder?.display_name ?? 'Anónimo'}
                      </Text>
                      <Text className="text-xs font-sans text-text-tertiary">
                        {new Date(b.created_at).toLocaleString('es-ES')}
                      </Text>
                    </View>
                    <Text className="text-base font-sans-black text-text-primary">
                      {formatUsd(b.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {isAuctionBlocked && tx.kind === 'auction' && !isSeller && (
          <Card variant="outline" className="mt-6 border-warning">
            <Text className="text-xs font-sans-semibold uppercase tracking-wider text-warning">
              Bloqueado
            </Text>
            <Text className="mt-1 text-sm font-sans text-text-primary">
              No puedes ofertar en subastas hasta el {formatShortDate(auctionBlockedUntil)}.
              Tras cumplir el plazo podrás volver a participar.
            </Text>
          </Card>
        )}
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 bg-bg px-5 pb-6 pt-3"
        style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E5EA' }}
      >
        <ListingActions
          tx={tx}
          isSeller={isSeller}
          isMutating={
            pauseMut.isPending ||
            resumeMut.isPending ||
            cancelMut.isPending ||
            purchaseMut.isPending ||
            closeMut.isPending
          }
          auctionEnded={auctionEnded}
          isAuctionBlocked={isAuctionBlocked}
          onPause={handlePause}
          onResume={handleResume}
          onCancel={handleCancel}
          onPurchase={handleRequestPurchase}
          onBid={handleBid}
        />
      </View>

      {tx.kind === 'auction' && (
        <BidSheet
          ref={bidSheet}
          listingId={listingId}
          currentBid={tx.current_bid}
          startPrice={tx.start_price}
          bidIncrement={tx.bid_increment}
          bidsCount={tx.bids_count}
        />
      )}
      <WhatsAppPrompt ref={whatsappPrompt} />
    </Screen>
  );
}

function Hero({
  items,
  kind,
}: {
  items: ListingItem[];
  kind: string;
}) {
  const first = items[0]?.catalog;
  if (!first) {
    return (
      <View className="mt-3 h-44 items-center justify-center rounded-lg bg-surface">
        <Text className="text-sm font-sans text-text-tertiary">Sin imagen disponible</Text>
      </View>
    );
  }

  return (
    <View
      className="mt-3 h-56 items-center justify-center rounded-lg overflow-hidden"
      style={{ backgroundColor: first.stripe ?? '#444' }}
    >
      {first.accent && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40%',
            backgroundColor: first.accent,
          }}
        />
      )}
      <Text className="text-6xl font-sans-black text-white">
        {first.jersey ?? (kind === 'package' ? items.length : '—')}
      </Text>
      <Text className="mt-2 text-base font-sans-bold text-white uppercase tracking-wider">
        {first.player_name ?? first.display_name}
      </Text>
      {first.country_code && (
        <View className="mt-3">
          <FlagDot
            code={first.country_code}
            color={first.stripe ?? '#444'}
            accentColor={first.accent ?? undefined}
            size="md"
          />
        </View>
      )}
    </View>
  );
}

function ListingActions({
  tx,
  isSeller,
  isMutating,
  auctionEnded,
  isAuctionBlocked,
  onPause,
  onResume,
  onCancel,
  onPurchase,
  onBid,
}: {
  tx: NonNullable<ReturnType<typeof useListingDetail>['data']>;
  isSeller: boolean;
  isMutating: boolean;
  auctionEnded: boolean;
  isAuctionBlocked: boolean;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onPurchase: () => void;
  onBid: () => void;
}) {
  if (tx.status === 'cancelled' || tx.status === 'completed') {
    return (
      <Button
        label={tx.status === 'completed' ? 'Vendida' : 'Cancelada'}
        size="lg"
        variant="secondary"
        disabled
        onPress={() => {}}
      />
    );
  }

  if (isSeller) {
    if (tx.kind === 'auction' && auctionEnded) {
      return (
        <Button
          label="Esperando cierre"
          size="lg"
          variant="secondary"
          disabled
          onPress={() => {}}
        />
      );
    }
    if (tx.status === 'active') {
      return (
        <View className="gap-2">
          <Button
            label="Pausar publicación"
            size="lg"
            variant="secondary"
            loading={isMutating}
            onPress={onPause}
          />
          <Button
            label="Cancelar publicación"
            variant="ghost"
            size="md"
            disabled={isMutating}
            onPress={onCancel}
          />
        </View>
      );
    }
    if (tx.status === 'reserved') {
      return (
        <View className="gap-2">
          <Button
            label="Reactivar"
            size="lg"
            loading={isMutating}
            onPress={onResume}
          />
          <Button
            label="Cancelar publicación"
            variant="ghost"
            size="md"
            disabled={isMutating}
            onPress={onCancel}
          />
        </View>
      );
    }
    return null;
  }

  // Buyer side
  if (tx.kind === 'auction') {
    if (auctionEnded) {
      return (
        <Button
          label="Subasta cerrada"
          size="lg"
          variant="secondary"
          disabled
          onPress={() => {}}
        />
      );
    }
    return (
      <Button
        label="Hacer una oferta"
        size="lg"
        loading={isMutating}
        disabled={isAuctionBlocked}
        onPress={onBid}
      />
    );
  }

  // sale / package
  if (tx.status !== 'active') {
    return (
      <Button
        label="No disponible"
        size="lg"
        variant="secondary"
        disabled
        onPress={() => {}}
      />
    );
  }
  return (
    <Button
      label="Solicitar compra"
      size="lg"
      loading={isMutating}
      onPress={onPurchase}
    />
  );
}

function labelForKind(kind: string): string {
  if (kind === 'auction') return 'Subasta';
  if (kind === 'package') return 'Lote';
  return 'Venta';
}

function asMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'unknown';
}

function messageForPurchaseError(code: string): string {
  if (code.includes('already_requested'))
    return 'Ya tienes una solicitud pendiente para esta publicación.';
  if (code.includes('self_purchase')) return 'No puedes comprar tu propia publicación.';
  if (code.includes('out_of_scope')) return 'No tienes permiso para comprar esta publicación.';
  if (code.includes('blocked')) return 'Estás bloqueado con este vendedor.';
  if (code.includes('not_available')) return 'La publicación ya no está disponible.';
  return 'No se pudo solicitar la compra.';
}

function messageForListingError(code: string): string {
  if (code.includes('has_open_transactions'))
    return 'No puedes hacerlo mientras hay solicitudes abiertas.';
  if (code.includes('not_active')) return 'La publicación ya no está activa.';
  if (code.includes('not_paused')) return 'La publicación no está pausada.';
  if (code.includes('auction_ended')) return 'La subasta ya finalizó.';
  if (code.includes('not_authorized')) return 'No tienes permiso para esta acción.';
  return 'No se pudo actualizar la publicación.';
}
