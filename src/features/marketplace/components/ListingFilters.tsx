import { ScrollView, View } from 'react-native';

import { Chip } from '@/ui';

import type { ListingKind } from '../data/listings';

export type ListingKindFilter = ListingKind | 'all';

type Props = {
  active: ListingKindFilter;
  onChange: (next: ListingKindFilter) => void;
};

const TABS: { value: ListingKindFilter; label: string }[] = [
  { value: 'all', label: 'Todo' },
  { value: 'sale', label: 'Venta' },
  { value: 'auction', label: 'Subasta' },
  { value: 'package', label: 'Lotes' },
];

export function ListingFilters({ active, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
    >
      <View className="flex-row gap-2">
        {TABS.map((t) => (
          <Chip
            key={t.value}
            label={t.label}
            size="sm"
            variant={active === t.value ? 'selected' : 'outline'}
            onPress={() => onChange(t.value)}
          />
        ))}
      </View>
    </ScrollView>
  );
}
