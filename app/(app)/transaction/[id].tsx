import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { universitiesById } from '@/features/auth/lib/universities';
import { useSession } from '@/features/auth/hooks/useSession';
import { MatchableCromoCard } from '@/features/matches/components/MatchableCromoCard';
import {
  WhatsAppPrompt,
  type WhatsAppPromptHandle,
} from '@/features/profile/components/WhatsAppPrompt';
import { useMyWhatsApp } from '@/features/profile/hooks/useWhatsApp';
import { RatingSheet, type RatingSheetHandle } from '@/features/transactions/components/RatingSheet';
import { useMyRatingForTx } from '@/features/transactions/hooks/useRatings';
import {
  useAcceptTransaction,
  useCancelTransaction,
  useCompleteTransaction,
  useTransaction,
} from '@/features/transactions/hooks/useTransactions';
import type {
  TransactionDetail,
  TransactionItemEnriched,
} from '@/features/transactions/data/transactions';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { whatsappUrl } from '@/shared/utils/whatsapp';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, Screen, ScreenHeader, Skeleton, useToast } from '@/ui';

export default function TransactionDetailScreen() {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const { user } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const txId = Array.isArray(id) ? id[0] : id;

  const detail = useTransaction(txId);
  const myWhatsApp = useMyWhatsApp();
  const myRating = useMyRatingForTx(txId);
  const acceptMut = useAcceptTransaction();
  const completeMut = useCompleteTransaction();
  const cancelMut = useCancelTransaction();
  const promptRef = useRef<WhatsAppPromptHandle>(null);
  const ratingRef = useRef<RatingSheetHandle>(null);

  // Realtime: refrescar al detectar UPDATE sobre la transacción.
  useEffect(() => {
    if (!txId) return;
    const channel = supabase
      .channel(`tx-detail-${txId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `id=eq.${txId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ['transactions', 'detail', txId] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [txId, qc]);

  if (!txId) {
    return (
      <Screen>
        <ScreenHeader title="Intercambio" onBack={() => router.back()} />
        <EmptyState title="Intercambio no encontrado" />
      </Screen>
    );
  }

  if (detail.isLoading) {
    return (
      <Screen>
        <ScreenHeader title="Intercambio" onBack={() => router.back()} />
        <View className="gap-3 px-5">
          <Skeleton width="60%" height={20} rounded="sm" />
          <Skeleton width="100%" height={120} rounded="md" />
          <Skeleton width="100%" height={120} rounded="md" />
        </View>
      </Screen>
    );
  }

  const tx = detail.data;
  if (!tx) {
    return (
      <Screen>
        <ScreenHeader title="Intercambio" onBack={() => router.back()} />
        <EmptyState
          title="Intercambio no encontrado"
          description="Quizá fue cancelado o ya no tienes permiso para verlo."
        />
      </Screen>
    );
  }

  const myId = user?.id ?? null;
  const counterparty = tx.my_role === 'initiator' ? tx.owner : tx.initiator;
  const uni = counterparty?.university ? universitiesById[counterparty.university] ?? null : null;

  const offered = filterItems(tx, 'offered', myId);
  const requested = filterItems(tx, 'requested', myId);

  const handleAccept = async () => {
    // 1) Si no tengo WhatsApp guardado, abrir prompt antes de aceptar.
    const phone = myWhatsApp.data?.whatsapp_phone;
    if (!phone) {
      promptRef.current?.present({
        onComplete: () => {
          void doAccept();
        },
      });
      return;
    }
    await doAccept();
  };

  const doAccept = async () => {
    try {
      await acceptMut.mutateAsync(txId);
      toast.show('Intercambio aceptado. Ya puedes contactar por WhatsApp.', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo aceptar el intercambio.';
      toast.show(msg, 'danger');
    }
  };

  const handleReject = async () => {
    try {
      await cancelMut.mutateAsync({ id: txId, reason: 'rejected_by_owner' });
      toast.show('Intercambio rechazado.', 'info');
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo rechazar.';
      toast.show(msg, 'danger');
    }
  };

  const handleComplete = async () => {
    try {
      await completeMut.mutateAsync(txId);
      toast.show('Intercambio marcado como realizado.', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo completar.';
      toast.show(msg, 'danger');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMut.mutateAsync({ id: txId });
      toast.show('Intercambio cancelado.', 'info');
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo cancelar.';
      toast.show(msg, 'danger');
    }
  };

  const openWhatsApp = async () => {
    const phone = tx.counterparty_whatsapp;
    if (!phone) {
      toast.show('Todavía no tenemos su WhatsApp.', 'warning');
      return;
    }
    const msg = `Hola ${counterparty?.display_name ?? ''}! Soy ${user?.email ?? 'tu match de Cromo Swap'}. Coordinamos el intercambio.`;
    const url = whatsappUrl(phone, msg);
    try {
      await Linking.openURL(url);
    } catch (err) {
      const m = err instanceof Error ? err.message : 'No se pudo abrir WhatsApp.';
      toast.show(m, 'danger');
    }
  };

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        eyebrow="Intercambio"
        title={counterparty?.display_name ?? 'Contraparte'}
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
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <StatusBanner status={tx.status} />

        <ItemsSection title="Tú ofreces" items={offered} />
        <View style={{ height: 16 }} />
        <ItemsSection title="Tú recibes" items={requested} />

        {(tx.status === 'accepted' || tx.status === 'completed') && (
          <View
            className="mt-6 rounded-md bg-surface p-4"
            style={{ borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}
          >
            <Text className="text-xs font-sans-semibold uppercase tracking-wider text-text-tertiary">
              Contacto
            </Text>
            {tx.counterparty_whatsapp ? (
              <>
                <Text className="mt-2 text-base font-sans-bold text-text-primary">
                  {tx.counterparty_whatsapp}
                </Text>
                <Text className="mt-1 text-xs text-text-secondary font-sans">
                  Acuerden lugar y hora para encontrarse.
                </Text>
              </>
            ) : (
              <Text className="mt-2 text-sm text-text-tertiary font-sans">
                El contacto se revela cuando la otra persona también guarde su WhatsApp.
              </Text>
            )}
          </View>
        )}

        {tx.status === 'completed' && !myRating.isLoading && (
          <View
            className="mt-4 rounded-md p-4"
            style={{
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border,
              backgroundColor: myRating.data?.exists
                ? colors.surface
                : `${colors.warning}10`,
            }}
          >
            <Text className="text-xs font-sans-semibold uppercase tracking-wider text-text-tertiary">
              Calificación
            </Text>
            {myRating.data?.exists ? (
              <>
                <View className="mt-2 flex-row items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Text
                      key={i}
                      style={{
                        fontSize: 18,
                        color: i < (myRating.data?.stars ?? 0) ? colors.warning : colors.border,
                      }}
                    >
                      ★
                    </Text>
                  ))}
                </View>
                {myRating.data.comment && (
                  <Text className="mt-2 text-sm font-sans text-text-secondary" numberOfLines={3}>
                    “{myRating.data.comment}”
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text className="mt-2 text-sm font-sans text-text-primary">
                  ¿Cómo te fue? Tu calificación ayuda a otros usuarios.
                </Text>
                <View className="mt-3">
                  <Button
                    label="Calificar intercambio"
                    size="sm"
                    onPress={() => {
                      const counterparty =
                        tx.my_role === 'initiator' ? tx.owner : tx.initiator;
                      ratingRef.current?.present(
                        tx.id,
                        counterparty?.display_name ?? 'Usuario',
                      );
                    }}
                  />
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 bg-bg px-5 pb-6 pt-3"
        style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}
      >
        <ActionButtons
          tx={tx}
          isMutating={
            acceptMut.isPending || completeMut.isPending || cancelMut.isPending
          }
          onAccept={handleAccept}
          onReject={handleReject}
          onComplete={handleComplete}
          onCancel={handleCancel}
          onOpenWhatsApp={openWhatsApp}
        />
      </View>

      <WhatsAppPrompt ref={promptRef} />
      <RatingSheet ref={ratingRef} onCreated={() => myRating.refetch()} />
    </Screen>
  );
}

function filterItems(
  tx: TransactionDetail,
  rolePrefix: 'offered' | 'requested',
  myId: string | null,
): TransactionItemEnriched[] {
  // Mapeo correcto: "Tú ofreces"  → role=offered y user_id=me.
  //                  "Tú recibes" → role=requested y user_id=me.
  // (En `transaction_items`, `user_id` indica el dueño del cromo,
  // `role` el rol dentro de la transacción.)
  if (!myId) return [];
  if (rolePrefix === 'offered') {
    return tx.items.filter((i) => i.role === 'offered' && i.user_id === myId);
  }
  return tx.items.filter((i) => i.role === 'requested' && i.user_id === myId);
}

function ItemsSection({ title, items }: { title: string; items: TransactionItemEnriched[] }) {
  return (
    <View className="mt-6">
      <Text className="mb-3 text-base font-sans-bold text-text-primary">{title}</Text>
      {items.length === 0 ? (
        <Text className="text-sm font-sans text-text-tertiary">Sin cromos en esta sección.</Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {items.map((it) => {
            const cat = it.catalog;
            if (!cat) {
              return (
                <View
                  key={it.id}
                  className="rounded-md bg-surface p-2 border border-border"
                  style={{ width: 96 }}
                >
                  <Text className="text-[11px] font-sans-semibold text-text-secondary">
                    Cromo
                  </Text>
                </View>
              );
            }
            return (
              <View key={it.id} style={{ width: 96 }}>
                <MatchableCromoCard
                  showCount={false}
                  cromo={{
                    id: cat.id,
                    printed_code: cat.printed_code ?? '',
                    display_name: cat.display_name,
                    player_name: cat.player_name,
                    jersey: cat.jersey,
                    position: null,
                    section_code: cat.section_code,
                    section_number: cat.section_number,
                    country_code: cat.country_code,
                    country_name: cat.country_name,
                    flag_emoji: cat.flag_emoji,
                    stripe: cat.stripe,
                    accent: cat.accent,
                    rarity_id: '',
                    rarity_label: cat.rarity_label,
                    available_quantity: it.quantity,
                  }}
                />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function StatusBanner({ status }: { status: string }) {
  const map: Record<string, { label: string; description: string; bg: string; text: string }> = {
    pending: {
      label: 'Pendiente',
      description: 'Esperando confirmación.',
      bg: 'bg-warning',
      text: 'text-white',
    },
    accepted: {
      label: 'Aceptado',
      description: 'Ya pueden contactarse por WhatsApp.',
      bg: 'bg-success',
      text: 'text-white',
    },
    completed: {
      label: 'Realizado',
      description: 'El intercambio fue marcado como hecho.',
      bg: 'bg-success',
      text: 'text-white',
    },
    cancelled: {
      label: 'Cancelado',
      description: 'Este intercambio fue cancelado.',
      bg: 'bg-surface',
      text: 'text-text-secondary',
    },
  };
  const cfg = map[status] ?? {
    label: status,
    description: '',
    bg: 'bg-surface',
    text: 'text-text-secondary',
  };
  return (
    <View className={`mt-2 rounded-md p-4 ${cfg.bg}`}>
      <Text className={`text-xs font-sans-semibold uppercase tracking-wider ${cfg.text} opacity-90`}>
        Estado
      </Text>
      <Text className={`mt-1 text-xl font-sans-black ${cfg.text}`}>{cfg.label}</Text>
      {cfg.description ? (
        <Text className={`mt-1 text-sm font-sans ${cfg.text} opacity-90`}>{cfg.description}</Text>
      ) : null}
    </View>
  );
}

type ActionProps = {
  tx: TransactionDetail;
  isMutating: boolean;
  onAccept: () => void;
  onReject: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onOpenWhatsApp: () => void;
};

function ActionButtons({
  tx,
  isMutating,
  onAccept,
  onReject,
  onComplete,
  onCancel,
  onOpenWhatsApp,
}: ActionProps) {
  if (tx.status === 'pending') {
    if (tx.my_role === 'owner') {
      return (
        <View className="gap-2">
          <Button label="Aceptar intercambio" size="lg" loading={isMutating} onPress={onAccept} />
          <Button
            label="Rechazar"
            variant="ghost"
            size="md"
            disabled={isMutating}
            onPress={onReject}
          />
        </View>
      );
    }
    return (
      <View className="gap-2">
        <Button
          label="Esperando respuesta"
          size="lg"
          variant="secondary"
          disabled
          onPress={() => {}}
        />
        <Button
          label="Cancelar mi propuesta"
          variant="ghost"
          size="md"
          disabled={isMutating}
          onPress={onCancel}
        />
      </View>
    );
  }
  if (tx.status === 'accepted') {
    return (
      <View className="gap-2">
        <Button label="Abrir WhatsApp" size="lg" onPress={onOpenWhatsApp} />
        <Button
          label="Marcar como realizado"
          variant="secondary"
          size="md"
          loading={isMutating}
          onPress={onComplete}
        />
      </View>
    );
  }
  if (tx.status === 'completed') {
    return (
      <Button
        label="Intercambio completado"
        size="lg"
        variant="secondary"
        disabled
        onPress={() => {}}
      />
    );
  }
  if (tx.status === 'cancelled') {
    return (
      <Button label="Cancelado" size="lg" variant="secondary" disabled onPress={() => {}} />
    );
  }
  return null;
}
