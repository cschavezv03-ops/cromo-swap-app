import { Pressable, StyleSheet, Text, View } from 'react-native';

import { universitiesById } from '@/features/auth/lib/universities';
import { cn } from '@/shared/utils/cn';
import { useTheme } from '@/theme/ThemeProvider';
import { Chip } from '@/ui';

type Props = {
  displayName: string;
  universityId: string | null;
  giveCount: number;
  getCount: number;
  matchType: string | null;
  /** Texto de estado opcional para matches ya creados ("Pendiente", "Mutual"). */
  statusLabel?: string | null;
  /** Tinte del statusLabel — 'warning' (pending), 'success' (mutual), 'tertiary' (other). */
  statusTone?: 'warning' | 'success' | 'tertiary' | 'danger';
  onPress: () => void;
};

const MATCH_TYPE_LABEL: Record<string, string> = {
  perfect: 'Perfecto',
  multiple: 'Múltiple',
  partial: 'Parcial',
  unbalanced: 'Desbalanceado',
};

const TONE_CLASS: Record<NonNullable<Props['statusTone']>, string> = {
  warning: 'text-warning',
  success: 'text-success',
  tertiary: 'text-text-tertiary',
  danger: 'text-danger',
};

/**
 * Fila estilo iOS Settings para suggestions o matches creados. Sin
 * cards: tipografía + hairline al pie. Tap → handler del padre.
 */
export function MatchRow({
  displayName,
  universityId,
  giveCount,
  getCount,
  matchType,
  statusLabel,
  statusTone = 'tertiary',
  onPress,
}: Props) {
  const { colors } = useTheme();
  const uni = universityId ? universitiesById[universityId] ?? null : null;
  const initial = displayName.trim()[0]?.toUpperCase() ?? '?';
  const typeLabel = matchType ? MATCH_TYPE_LABEL[matchType] ?? matchType : null;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-5 py-3 active:bg-surface"
      style={{
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      }}
    >
      <View className="mr-3 h-11 w-11 items-center justify-center rounded-pill bg-surface">
        <Text className="text-base font-sans-bold text-text-primary">{initial}</Text>
      </View>

      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-sans-semibold text-text-primary" numberOfLines={1}>
            {displayName}
          </Text>
          {uni && (
            <View
              className="flex-row items-center gap-1 rounded-pill px-2 py-0.5"
              style={{ backgroundColor: `${uni.color}1A` }}
            >
              <View
                style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: uni.color }}
              />
              <Text className="text-[10px] font-sans-bold" style={{ color: uni.color }}>
                {uni.short}
              </Text>
            </View>
          )}
        </View>
        <Text className="mt-0.5 text-xs text-text-secondary font-sans">
          Te puede dar {getCount} · Tú le das {giveCount}
        </Text>
        {statusLabel && (
          <Text className={cn('mt-0.5 text-[11px] font-sans-semibold', TONE_CLASS[statusTone])}>
            {statusLabel}
          </Text>
        )}
      </View>

      {typeLabel && (
        <View className="ml-3">
          <Chip label={typeLabel} size="sm" variant="default" />
        </View>
      )}
    </Pressable>
  );
}
