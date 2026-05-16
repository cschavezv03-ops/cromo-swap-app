import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { MatchRow } from '@/features/matches/components/MatchRow';
import {
  useMatchSuggestions,
  useMyMatches,
} from '@/features/matches/hooks/useMatches';
import { Chip, EmptyState, Screen, ScreenHeader, Skeleton } from '@/ui';

type Tab = 'suggested' | 'sent' | 'received';

export default function MatchesTab() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('suggested');

  const suggestions = useMatchSuggestions();
  const sent = useMyMatches('sent');
  const received = useMyMatches('received');

  const active =
    tab === 'suggested' ? suggestions : tab === 'sent' ? sent : received;
  const isRefreshing = Boolean(active.isFetching && !active.isLoading);

  const counts = useMemo(
    () => ({
      suggested: suggestions.data?.length ?? 0,
      sent: sent.data?.length ?? 0,
      received: received.data?.length ?? 0,
    }),
    [suggestions.data, sent.data, received.data],
  );

  const onRefresh = () => {
    void active.refetch();
  };

  return (
    <Screen>
      <ScreenHeader title="Matches" />

      <View className="flex-row gap-2 px-5 pb-3">
        <Chip
          label="Sugeridos"
          count={counts.suggested}
          variant={tab === 'suggested' ? 'selected' : 'default'}
          size="sm"
          onPress={() => setTab('suggested')}
        />
        <Chip
          label="Enviados"
          count={counts.sent}
          variant={tab === 'sent' ? 'selected' : 'default'}
          size="sm"
          onPress={() => setTab('sent')}
        />
        <Chip
          label="Recibidos"
          count={counts.received}
          variant={tab === 'received' ? 'selected' : 'default'}
          size="sm"
          onPress={() => setTab('received')}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {tab === 'suggested' && (
          <SuggestedList
            isLoading={suggestions.isLoading}
            data={suggestions.data ?? []}
            onOpen={(counterpartyId) =>
              router.push({ pathname: '/(app)/match/[id]', params: { id: counterpartyId } })
            }
          />
        )}
        {tab === 'sent' && (
          <CreatedList
            isLoading={sent.isLoading}
            data={sent.data ?? []}
            direction="sent"
            onOpen={(counterpartyId) =>
              router.push({ pathname: '/(app)/match/[id]', params: { id: counterpartyId } })
            }
          />
        )}
        {tab === 'received' && (
          <CreatedList
            isLoading={received.isLoading}
            data={received.data ?? []}
            direction="received"
            onOpen={(counterpartyId) =>
              router.push({ pathname: '/(app)/match/[id]', params: { id: counterpartyId } })
            }
          />
        )}
      </ScrollView>
    </Screen>
  );
}

function LoadingRows() {
  return (
    <View className="px-5 py-3 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} className="flex-row items-center gap-3">
          <Skeleton width={44} height={44} rounded="pill" />
          <View className="flex-1 gap-1">
            <Skeleton width="55%" height={14} rounded="sm" />
            <Skeleton width="40%" height={11} rounded="sm" />
          </View>
        </View>
      ))}
    </View>
  );
}

type SuggestionsListProps = {
  isLoading: boolean;
  data: ReturnType<typeof useMatchSuggestions>['data'] extends infer T ? Exclude<T, undefined> : never;
  onOpen: (counterpartyId: string) => void;
};

function SuggestedList({ isLoading, data, onOpen }: SuggestionsListProps) {
  if (isLoading) return <LoadingRows />;
  if (data.length === 0) {
    return (
      <EmptyState
        title="Aún no hay sugerencias"
        description="A medida que tú y otros usuarios marquen repetidos y faltantes, aquí verás candidatos para intercambiar."
      />
    );
  }
  return (
    <View>
      {data.map((row) => {
        const counterpartyId = row.counterparty_id ?? row.profile?.id;
        if (!counterpartyId) return null;
        const name = row.profile?.display_name ?? 'Usuario';
        return (
          <MatchRow
            key={counterpartyId}
            displayName={name}
            universityId={row.profile?.university ?? row.university ?? null}
            giveCount={Number(row.give_count ?? 0)}
            getCount={Number(row.get_count ?? 0)}
            matchType={row.match_type}
            onPress={() => onOpen(counterpartyId)}
          />
        );
      })}
    </View>
  );
}

type CreatedListProps = {
  isLoading: boolean;
  data: ReturnType<typeof useMyMatches>['data'] extends infer T ? Exclude<T, undefined> : never;
  direction: 'sent' | 'received';
  onOpen: (counterpartyId: string) => void;
};

function CreatedList({ isLoading, data, direction, onOpen }: CreatedListProps) {
  if (isLoading) return <LoadingRows />;
  if (data.length === 0) {
    return (
      <EmptyState
        title={direction === 'sent' ? 'No has propuesto matches' : 'No tienes matches recibidos'}
        description={
          direction === 'sent'
            ? 'Cuando propongas un match a alguien, aparecerá aquí mientras espera respuesta.'
            : 'Cuando alguien te proponga un match, lo verás aquí para aceptarlo o rechazarlo.'
        }
      />
    );
  }
  return (
    <View>
      {data.map((m) => {
        const cp = m.counterparty;
        if (!cp) return null;
        const myResponse = m.role === 'a' ? m.user_a_response : m.user_b_response;
        const otherResponse = m.role === 'a' ? m.user_b_response : m.user_a_response;
        const { label, tone } = statusFor(m.status, myResponse, otherResponse, direction);
        return (
          <MatchRow
            key={m.id}
            displayName={cp.display_name}
            universityId={cp.university ?? null}
            giveCount={m.give_count}
            getCount={m.get_count}
            matchType={m.match_type}
            statusLabel={label}
            statusTone={tone}
            onPress={() => onOpen(cp.id)}
          />
        );
      })}
    </View>
  );
}

function statusFor(
  status: string,
  myResponse: string,
  otherResponse: string,
  direction: 'sent' | 'received',
): { label: string; tone: 'warning' | 'success' | 'tertiary' | 'danger' } {
  if (status === 'mutual') return { label: 'Match mutuo', tone: 'success' };
  if (status === 'cancelled') return { label: 'Cancelado', tone: 'tertiary' };
  if (status === 'expired') return { label: 'Expirado', tone: 'tertiary' };
  if (status === 'pending') {
    if (direction === 'received' && myResponse === 'pending') {
      return { label: 'Esperando tu respuesta', tone: 'warning' };
    }
    if (direction === 'sent' && otherResponse === 'pending') {
      return { label: 'Esperando respuesta', tone: 'warning' };
    }
    if (myResponse === 'rejected' || otherResponse === 'rejected') {
      return { label: 'Rechazado', tone: 'danger' };
    }
    return { label: 'Pendiente', tone: 'warning' };
  }
  return { label: status, tone: 'tertiary' };
}
