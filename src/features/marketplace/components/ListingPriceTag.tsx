import { Text, View } from 'react-native';

import { cn } from '@/shared/utils/cn';

import { formatUsd } from '../lib/time';
import type { ListingSummary } from '../data/listings';

type Props = {
  listing: Pick<
    ListingSummary,
    'kind' | 'price' | 'current_bid' | 'start_price' | 'bids_count'
  >;
  className?: string;
  /** Si true, agranda los números (uso en detalle). */
  large?: boolean;
};

/**
 * Chip / bloque con el precio relevante según el tipo de listing.
 *  - sale / package: precio fijo
 *  - auction: current_bid (o start_price si no hay bids), + contador de bids
 */
export function ListingPriceTag({ listing, className, large = false }: Props) {
  const big = large ? 'text-3xl' : 'text-lg';
  const small = large ? 'text-xs' : 'text-[10px]';

  if (listing.kind === 'auction') {
    const value = listing.current_bid ?? listing.start_price ?? null;
    return (
      <View className={cn('flex-col', className)}>
        <Text
          className={cn(small, 'font-sans-semibold uppercase tracking-wider text-text-tertiary')}
        >
          {listing.bids_count > 0 ? 'Oferta actual' : 'Precio inicial'}
        </Text>
        <Text className={cn(big, 'font-sans-black text-text-primary mt-0.5')}>
          {formatUsd(value)}
        </Text>
        {listing.bids_count > 0 && (
          <Text className="text-xs font-sans-medium text-text-secondary mt-0.5">
            {listing.bids_count} oferta{listing.bids_count === 1 ? '' : 's'}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View className={cn('flex-col', className)}>
      <Text className={cn(small, 'font-sans-semibold uppercase tracking-wider text-text-tertiary')}>
        Precio
      </Text>
      <Text className={cn(big, 'font-sans-black text-text-primary mt-0.5')}>
        {formatUsd(listing.price)}
      </Text>
    </View>
  );
}
