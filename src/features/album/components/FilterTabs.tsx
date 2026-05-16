import { ScrollView } from 'react-native';

import { Chip } from '@/ui';

import type { AlbumStats, FilterTab } from '../lib/types';

type Props = {
  current: FilterTab;
  stats: AlbumStats;
  onChange: (tab: FilterTab) => void;
};

const TABS: Array<{ key: FilterTab; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'missing', label: 'Faltan' },
  { key: 'repeated', label: 'Repetidos' },
  { key: 'have', label: 'Tengo' },
];

function countFor(key: FilterTab, stats: AlbumStats): number {
  switch (key) {
    case 'all':
      return stats.total;
    case 'missing':
      return stats.missing;
    case 'repeated':
      return stats.repeated;
    case 'have':
      return stats.have + stats.repeated;
  }
}

export function FilterTabs({ current, stats, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
    >
      {TABS.map((tab) => (
        <Chip
          key={tab.key}
          label={tab.label}
          count={countFor(tab.key, stats)}
          variant={current === tab.key ? 'selected' : 'default'}
          onPress={() => onChange(tab.key)}
        />
      ))}
    </ScrollView>
  );
}
