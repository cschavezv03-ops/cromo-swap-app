import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { universitiesById } from '@/features/auth/lib/universities';
import { useTheme } from '@/theme/ThemeProvider';
import { FlagDot } from '@/ui';

import type { ListingSummary } from '../data/listings';
import { formatUsd } from '../lib/time';

import { AuctionCountdown } from './AuctionCountdown';

type Props = {
  listing: ListingSummary;
  onPress?: () => void;
};

function ListingCardImpl({ listing, onPress }: Props) {
  const { colors } = useTheme();
  const seller = listing.seller;
  const uni = seller?.university ? universitiesById[seller.university] ?? null : null;
  const firstItem = listing.items[0];
  const cat = firstItem?.catalog ?? null;
  const totalItems = listing.items.reduce((acc, it) => acc + it.quantity, 0);

  const kindLabel = labelForKind(listing.kind, listing.items.length);
  const priceLabel = priceForListing(listing);

  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 16,
        flexDirection: 'row',
        gap: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      }}
      android_ripple={{ color: colors.surface }}
    >
      <View
        style={{
          width: 76,
          height: 96,
          borderRadius: 8,
          backgroundColor: cat?.stripe ?? colors.surface,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {cat?.accent && (
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '38%',
              backgroundColor: cat.accent,
            }}
          />
        )}
        <Text className="text-3xl font-sans-black text-white">
          {cat?.jersey ?? (listing.kind === 'package' ? totalItems : '—')}
        </Text>
        {cat?.country_code && (
          <View style={{ position: 'absolute', bottom: 4, right: 4 }}>
            <FlagDot
              code={cat.country_code}
              color={cat.stripe ?? '#444'}
              accentColor={cat.accent ?? undefined}
              size="sm"
            />
          </View>
        )}
      </View>

      <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: 2 }}>
        <View>
          <View className="flex-row items-center gap-2">
            <Text className="text-[10px] font-sans-bold uppercase tracking-wider text-text-tertiary">
              {kindLabel}
            </Text>
            {listing.negotiable && (
              <Text className="text-[10px] font-sans-semibold uppercase tracking-wider text-accent">
                Negociable
              </Text>
            )}
          </View>
          <Text
            numberOfLines={1}
            className="mt-1 text-base font-sans-bold text-text-primary"
          >
            {titleForListing(listing)}
          </Text>
          {listing.kind === 'package' && listing.items.length > 1 && (
            <Text className="mt-0.5 text-xs font-sans text-text-tertiary">
              {listing.items.length} cromos · {totalItems} unidades
            </Text>
          )}
          {seller?.display_name && (
            <View className="mt-1 flex-row items-center gap-2">
              <Text className="text-xs font-sans-medium text-text-secondary">
                {seller.display_name}
              </Text>
              {uni && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 999,
                    backgroundColor: `${uni.color}1A`,
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: uni.color,
                    }}
                  />
                  <Text
                    className="text-[10px] font-sans-bold"
                    style={{ color: uni.color }}
                  >
                    {uni.short}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View className="flex-row items-end justify-between">
          <Text className="text-xl font-sans-black text-text-primary">{priceLabel}</Text>
          {listing.kind === 'auction' && (
            <AuctionCountdown endsAt={listing.ends_at} className="text-xs" />
          )}
        </View>
      </View>
    </Pressable>
  );
}

export const ListingCard = memo(ListingCardImpl);

function labelForKind(kind: string, itemsCount: number): string {
  if (kind === 'auction') return 'Subasta';
  if (kind === 'package') return `Lote · ${itemsCount}`;
  return 'Venta';
}

function titleForListing(listing: ListingSummary): string {
  const first = listing.items[0]?.catalog;
  if (!first) {
    if (listing.description) return listing.description;
    return 'Publicación sin título';
  }
  if (listing.kind === 'package' && listing.items.length > 1) {
    return `Lote de cromos${first.country_name ? ` · ${first.country_name}` : ''}`;
  }
  const player = first.player_name ?? first.display_name;
  const code = first.printed_code ? ` · ${first.printed_code}` : '';
  return `${player}${code}`;
}

function priceForListing(listing: ListingSummary): string {
  if (listing.kind === 'auction') {
    return formatUsd(listing.current_bid ?? listing.start_price);
  }
  return formatUsd(listing.price);
}
