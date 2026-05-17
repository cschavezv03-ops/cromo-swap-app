import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { universitiesById } from '@/features/auth/lib/universities';
import { MatchRow } from '@/features/matches/components/MatchRow';
import {
  useMatchSuggestions,
  useMyMatches,
} from '@/features/matches/hooks/useMatches';
import {
  useSearchProfiles,
  type ProfileSearchResult,
} from '@/features/profile/hooks/useSearchProfiles';
import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Chip, EmptyState, Screen, ScreenHeader, Skeleton } from '@/ui';

type Tab = 'suggested' | 'sent' | 'received';

export default function MatchesTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('suggested');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const suggestions = useMatchSuggestions();
  const sent = useMyMatches('sent');
  const received = useMyMatches('received');
  const search = useSearchProfiles(debouncedQuery);
  const isSearching = debouncedQuery.length >= 2;

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

      <View className="px-5 pb-2">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            height: 40,
            borderRadius: 12,
            backgroundColor: colors.surface,
          }}
        >
          <Text style={{ color: colors.textTertiary, fontSize: 14, marginRight: 8 }}>
            ⌕
          </Text>
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Buscar gente por nombre…"
            placeholderTextColor={colors.textTertiary}
            style={{ flex: 1, color: colors.textPrimary, fontSize: 14 }}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchInput.length > 0 && (
            <Pressable onPress={() => setSearchInput('')} hitSlop={8}>
              <Text style={{ color: colors.textTertiary, fontSize: 14 }}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

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
        keyboardShouldPersistTaps="handled"
      >
        {isSearching && (
          <SearchResultsList
            isLoading={search.isLoading}
            data={search.data ?? []}
            onOpen={(id) =>
              router.push({ pathname: '/(app)/profile/[id]', params: { id } })
            }
          />
        )}
        {!isSearching && tab === 'suggested' && (
          <SuggestedList
            isLoading={suggestions.isLoading}
            data={suggestions.data ?? []}
            onOpen={(counterpartyId) =>
              router.push({ pathname: '/(app)/match/[id]', params: { id: counterpartyId } })
            }
          />
        )}
        {!isSearching && tab === 'sent' && (
          <CreatedList
            isLoading={sent.isLoading}
            data={sent.data ?? []}
            direction="sent"
            onOpen={(counterpartyId) =>
              router.push({ pathname: '/(app)/match/[id]', params: { id: counterpartyId } })
            }
          />
        )}
        {!isSearching && tab === 'received' && (
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
            avatarUrl={row.profile?.avatar_url ?? null}
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
            avatarUrl={cp.avatar_url ?? null}
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

type SearchResultsListProps = {
  isLoading: boolean;
  data: ProfileSearchResult[];
  onOpen: (id: string) => void;
};

function SearchResultsList({ isLoading, data, onOpen }: SearchResultsListProps) {
  const { colors } = useTheme();
  if (isLoading) return <LoadingRows />;
  if (data.length === 0) {
    return (
      <EmptyState
        title="Sin resultados"
        description="Probá con otro nombre o verificá que esa persona ya creó su perfil."
      />
    );
  }
  return (
    <View>
      {data.map((p) => {
        const uni = p.university ? universitiesById[p.university] : null;
        return (
          <Pressable
            key={p.id}
            onPress={() => onOpen(p.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            }}
          >
            <Avatar url={p.avatar_url} name={p.display_name} size={44} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View className="flex-row items-center gap-2">
                <Text
                  className="text-base font-sans-semibold text-text-primary"
                  numberOfLines={1}
                >
                  {p.display_name}
                </Text>
                {p.is_friend && (
                  <Text className="text-[11px] font-sans-semibold text-success">
                    ✓ Amigo
                  </Text>
                )}
              </View>
              <View className="mt-0.5 flex-row items-center gap-2">
                {uni && (
                  <Text
                    className="text-xs font-sans-semibold"
                    style={{ color: uni.color }}
                  >
                    {uni.short}
                  </Text>
                )}
                {typeof p.album_pct === 'number' && (
                  <Text className="text-xs font-sans-medium text-text-tertiary">
                    · {Math.round(p.album_pct)}% del álbum
                  </Text>
                )}
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
