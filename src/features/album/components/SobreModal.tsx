import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, SectionList, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Button, Text } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useBulkIncrement } from '@/features/album/data/mutations';
import { groupByCountry, type AlbumItem } from '@/features/album/lib/album';

type Props = {
  visible: boolean;
  items: AlbumItem[];
  userId: string | undefined;
  onClose: () => void;
};

const SOBRE_COLUMNS = 6;
const SOBRE_GAP = 6;
const SOBRE_PADDING = 16;

function MiniCard({
  item,
  added,
  width,
  height,
  onTap,
  onLongPress,
}: {
  item: AlbumItem;
  added: number;
  width: number;
  height: number;
  onTap: () => void;
  onLongPress: () => void;
}) {
  const code = item.printed_code ?? String(item.section_number ?? '').padStart(3, '0');
  const jersey = item.jersey != null ? String(item.jersey) : code;
  const accent = item.accent ?? '#15140F';
  const justAdded = added > 0;

  return (
    <Pressable
      onPress={onTap}
      onLongPress={onLongPress}
      delayLongPress={280}
      style={{ width, height }}
      android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: false }}
      className={cn(
        'overflow-hidden rounded-md border',
        justAdded ? 'border-verde-700 bg-verde-100' : 'border-ink-100 bg-white',
      )}
    >
      <View style={{ height: 4, backgroundColor: justAdded ? '#1F5E3F' : accent }} />
      <View className="flex-1 items-center justify-center px-1">
        <Text className="text-2xs text-ink-500">{code}</Text>
        <Text
          style={{ color: justAdded ? '#1F5E3F' : accent }}
          className="text-base font-extrabold"
          numberOfLines={1}
        >
          {jersey}
        </Text>
      </View>
      {justAdded ? (
        <View className="absolute right-0.5 top-0.5 h-4 min-w-[18px] items-center justify-center rounded-full bg-verde-700 px-1">
          <Text className="text-[10px] font-bold text-cream">+{added}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function SobreModal({ visible, items, userId, onClose }: Props) {
  const { width: screenW } = useWindowDimensions();
  const bulk = useBulkIncrement();
  const [counts, setCounts] = useState<Record<string, number>>({});

  const cardW = Math.floor((screenW - SOBRE_PADDING * 2 - SOBRE_GAP * (SOBRE_COLUMNS - 1)) / SOBRE_COLUMNS);
  const cardH = Math.floor(cardW * 1.18);

  const sections = useMemo(() => groupByCountry(items, SOBRE_COLUMNS), [items]);
  const sectionListData = useMemo(
    () =>
      sections.map((s) => ({
        countryCode: s.countryCode,
        countryName: s.countryName,
        flag: s.flag,
        accent: s.accent,
        total: s.total,
        owned: s.owned,
        data: s.rows,
      })),
    [sections],
  );

  const totalAdded = useMemo(
    () => Object.values(counts).reduce((acc, n) => acc + n, 0),
    [counts],
  );

  const reset = useCallback(() => {
    setCounts({});
  }, []);

  const close = useCallback(() => {
    if (totalAdded > 0) {
      Alert.alert(
        'Tenés cromos sin confirmar',
        `Vas a perder ${totalAdded} cromo${totalAdded === 1 ? '' : 's'} que tocaste. ¿Cerrar igual?`,
        [
          { text: 'Seguir agregando', style: 'cancel' },
          { text: 'Cerrar sin guardar', style: 'destructive', onPress: () => { reset(); onClose(); } },
        ],
      );
    } else {
      onClose();
    }
  }, [totalAdded, onClose, reset]);

  const tap = useCallback((item: AlbumItem) => {
    if (!item.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setCounts((prev) => ({ ...prev, [item.id!]: (prev[item.id!] ?? 0) + 1 }));
  }, []);

  const undo = useCallback((cromoId: string) => {
    Haptics.selectionAsync().catch(() => undefined);
    setCounts((prev) => {
      const cur = prev[cromoId] ?? 0;
      if (cur <= 1) {
        const { [cromoId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [cromoId]: cur - 1 };
    });
  }, []);

  const confirm = useCallback(async () => {
    if (!userId || totalAdded === 0) return;
    await bulk.mutateAsync({ userId, counts });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    reset();
    onClose();
  }, [userId, totalAdded, bulk, counts, reset, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      <View className="flex-1 bg-cream">
        <View className="border-b border-ink-100 bg-white px-4 pb-3 pt-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text variant="overline">Sobre nuevo</Text>
              <Text variant="h2">Tocá cada cromo que salió</Text>
            </View>
            <Pressable onPress={close} className="h-10 w-10 items-center justify-center rounded-full bg-cream-200 active:bg-cream-300">
              <Text className="text-xl text-ink-900">×</Text>
            </Pressable>
          </View>
          {totalAdded > 0 ? (
            <View className="mt-3 flex-row items-center justify-between rounded-full bg-verde-700 px-4 py-2">
              <Text className="text-sm font-bold text-cream">
                {totalAdded} cromo{totalAdded === 1 ? '' : 's'} agregado{totalAdded === 1 ? '' : 's'}
              </Text>
              <Pressable onPress={reset}>
                <Text className="text-xs font-semibold text-cream/80">Limpiar</Text>
              </Pressable>
            </View>
          ) : (
            <Text variant="caption" className="mt-2">
              Mantené apretado un cromo agregado para restar uno.
            </Text>
          )}
        </View>

        <SectionList
          sections={sectionListData}
          keyExtractor={(row, idx) => `srow-${row[0]?.id ?? idx}`}
          contentContainerStyle={{ paddingHorizontal: SOBRE_PADDING, paddingBottom: 120 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View className="flex-row items-center gap-2 bg-cream pb-2 pt-4">
              <Text className="text-xl">{section.flag}</Text>
              <Text className="text-sm font-bold text-ink-900">{section.countryName}</Text>
              <Text className="text-xs text-ink-500">· {section.countryCode}</Text>
            </View>
          )}
          renderItem={({ item: row }) => (
            <View className="flex-row" style={{ gap: SOBRE_GAP, marginBottom: SOBRE_GAP }}>
              {Array.from({ length: SOBRE_COLUMNS }).map((_, i) => {
                const it = row[i];
                if (!it) return <View key={`e-${i}`} style={{ width: cardW, height: cardH }} />;
                const added = it.id ? (counts[it.id] ?? 0) : 0;
                return (
                  <MiniCard
                    key={it.id ?? `mc-${i}`}
                    item={it}
                    added={added}
                    width={cardW}
                    height={cardH}
                    onTap={() => tap(it)}
                    onLongPress={() => it.id && undo(it.id)}
                  />
                );
              })}
            </View>
          )}
          windowSize={11}
          initialNumToRender={10}
          maxToRenderPerBatch={12}
        />

        <View className="absolute bottom-0 left-0 right-0 border-t border-ink-100 bg-white px-4 pb-8 pt-3">
          <Button
            label={totalAdded === 0 ? 'Tocá cromos para sumar' : `Confirmar ${totalAdded} cromo${totalAdded === 1 ? '' : 's'}`}
            size="lg"
            disabled={totalAdded === 0}
            loading={bulk.isPending}
            onPress={confirm}
          />
        </View>
      </View>
    </Modal>
  );
}
