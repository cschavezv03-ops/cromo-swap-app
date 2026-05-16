import { ScrollView, View } from 'react-native';
import { Pill } from '@/shared/ui';
import type { AlbumFilter } from '@/features/album/lib/album';

type Counts = { total: number; owned: number; missing: number; repeated: number };

type Props = {
  filter: AlbumFilter;
  counts: Counts;
  onChange: (f: AlbumFilter) => void;
};

export function FiltersBar({ filter, counts, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingRight: 16 }}
    >
      <View className="flex-row gap-2">
        <Pill label="Todos" count={counts.total} active={filter === 'all'} onPress={() => onChange('all')} />
        <Pill label="Faltan" count={counts.missing} active={filter === 'missing'} onPress={() => onChange('missing')} />
        <Pill label="Repetidos" count={counts.repeated} active={filter === 'repeated'} onPress={() => onChange('repeated')} />
        <Pill label="Tengo" count={counts.owned} active={filter === 'have'} onPress={() => onChange('have')} />
      </View>
    </ScrollView>
  );
}
