import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { universitiesById } from '@/features/auth/lib/universities';
import { MatchableCromoCard } from '@/features/matches/components/MatchableCromoCard';
import { useMatchableCromos, useProposeMatch } from '@/features/matches/hooks/useMatches';
import { useMyMatches } from '@/features/matches/hooks/useMatches';
import type { MatchableCromo } from '@/features/matches/data/match-detail';
import { track } from '@/lib/observability';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Chip, EmptyState, Screen, ScreenHeader, Skeleton, useToast } from '@/ui';

const GRID_COLS = 4;
const GRID_GAP = 8;
const GRID_HPADDING = 20;

export default function MatchDetailScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const counterpartyId = Array.isArray(id) ? id[0] : id;

  const detail = useMatchableCromos(counterpartyId);
  const sent = useMyMatches('sent');
  const received = useMyMatches('received');
  const propose = useProposeMatch();

  const { width } = useWindowDimensions();
  const cardWidth = useMemo(() => {
    const totalGap = GRID_GAP * (GRID_COLS - 1);
    const totalPadding = GRID_HPADDING * 2;
    return Math.floor((width - totalGap - totalPadding) / GRID_COLS);
  }, [width]);

  const existingMatch = useMemo(() => {
    if (!counterpartyId) return null;
    const fromSent = (sent.data ?? []).find((m) => m.counterparty?.id === counterpartyId);
    if (fromSent) return { match: fromSent, direction: 'sent' as const };
    const fromReceived = (received.data ?? []).find((m) => m.counterparty?.id === counterpartyId);
    if (fromReceived) return { match: fromReceived, direction: 'received' as const };
    return null;
  }, [counterpartyId, sent.data, received.data]);

  if (!counterpartyId) {
    return (
      <Screen>
        <ScreenHeader title="Detalle" onBack={() => router.back()} />
        <EmptyState title="Match no encontrado" />
      </Screen>
    );
  }

  const isLoading = detail.isLoading;
  const data = detail.data;
  const cp = data?.counterparty;
  const uni = cp?.university ? (universitiesById[cp.university] ?? null) : null;
  const iCanGive = data?.iCanGive ?? [];
  const iCanGet = data?.iCanGet ?? [];

  const matchType = deriveMatchType(iCanGive.length, iCanGet.length);
  const canPropose =
    !existingMatch && (iCanGive.length > 0 || iCanGet.length > 0) && !propose.isPending;

  const onPropose = async () => {
    if (!counterpartyId) return;
    try {
      await propose.mutateAsync({
        targetUserId: counterpartyId,
        matchType: matchType ?? undefined,
        giveCount: iCanGive.length,
        getCount: iCanGet.length,
        reason: {
          give_cromo_ids: iCanGive.map((c) => c.id),
          get_cromo_ids: iCanGet.map((c) => c.id),
        },
      });
      track('match_proposed', {
        match_type: matchType,
        give_count: iCanGive.length,
        get_count: iCanGet.length,
      });
      toast.show('Match propuesto. Te avisaremos cuando responda.', 'success');
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo proponer el match.';
      toast.show(msg, 'danger');
    }
  };

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        eyebrow="Match"
        title={cp?.display_name ?? 'Cargando…'}
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
              <Text className="font-sans-bold text-[11px]" style={{ color: uni.color }}>
                {uni.short}
              </Text>
            </View>
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: GRID_HPADDING }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <LoadingGrid cardWidth={cardWidth} />
        ) : (
          <>
            {existingMatch && (
              <View
                className="mb-5 rounded-md bg-surface p-4"
                style={{ borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}
              >
                <Text className="font-sans-semibold text-xs uppercase tracking-wider text-text-tertiary">
                  Estado del match
                </Text>
                <Text className="mt-1 font-sans-bold text-base text-text-primary">
                  {labelForMatch(existingMatch.match.status, existingMatch.direction)}
                </Text>
              </View>
            )}

            <Section
              title="Te puede dar"
              count={iCanGet.length}
              empty="El otro no tiene repetidos que tú necesites todavía."
              cromos={iCanGet}
              cardWidth={cardWidth}
            />

            <View style={{ height: 12 }} />

            <Section
              title="Tú le das"
              count={iCanGive.length}
              empty="No tienes repetidos que al otro le falten todavía."
              cromos={iCanGive}
              cardWidth={cardWidth}
            />
          </>
        )}
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 bg-bg px-5 pb-6 pt-3"
        style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}
      >
        <Button
          label={
            existingMatch
              ? 'Match ya propuesto'
              : `Proponer intercambio${iCanGive.length || iCanGet.length ? '' : ''}`
          }
          size="lg"
          loading={propose.isPending}
          disabled={!canPropose}
          onPress={onPropose}
        />
      </View>
    </Screen>
  );
}

type SectionProps = {
  title: string;
  count: number;
  empty: string;
  cromos: MatchableCromo[];
  cardWidth: number;
};

function Section({ title, count, empty, cromos, cardWidth }: SectionProps) {
  return (
    <View>
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="font-sans-bold text-base text-text-primary">{title}</Text>
        <Chip label={String(count)} size="sm" variant="default" />
      </View>
      {cromos.length === 0 ? (
        <Text className="font-sans text-sm text-text-tertiary">{empty}</Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP }}>
          {cromos.map((cromo) => (
            <View key={cromo.id} style={{ width: cardWidth }}>
              <MatchableCromoCard cromo={cromo} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function LoadingGrid({ cardWidth }: { cardWidth: number }) {
  return (
    <View className="gap-3">
      <Skeleton width="40%" height={18} rounded="sm" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} width={cardWidth} height={104} rounded="md" />
        ))}
      </View>
    </View>
  );
}

function deriveMatchType(giveCount: number, getCount: number): string | null {
  if (giveCount === 1 && getCount === 1) return 'perfect';
  if (giveCount >= 2 && giveCount === getCount) return 'multiple';
  if (giveCount >= 1 && getCount >= 1) return 'partial';
  return 'unbalanced';
}

function labelForMatch(status: string, direction: 'sent' | 'received'): string {
  if (status === 'mutual') return 'Match mutuo. Avanza al intercambio.';
  if (status === 'pending') {
    return direction === 'sent'
      ? 'Esperando respuesta de la otra persona.'
      : 'Tienes este match pendiente de tu respuesta.';
  }
  if (status === 'cancelled') return 'Cancelado.';
  if (status === 'expired') return 'Expirado.';
  return status;
}
