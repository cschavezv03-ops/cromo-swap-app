import { Pressable, StyleSheet, Text, View } from 'react-native';

import { universitiesById } from '@/features/auth/lib/universities';
import { useTheme } from '@/theme/ThemeProvider';
import { Avatar } from '@/ui';

type Props = {
  displayName: string;
  avatarUrl?: string | null;
  universityId: string | null;
  albumPct?: number | null;
  isLast?: boolean;
  rightSlot?: React.ReactNode;
  onPress?: () => void;
};

export function FriendRow({
  displayName,
  avatarUrl,
  universityId,
  albumPct,
  isLast = false,
  rightSlot,
  onPress,
}: Props) {
  const { colors } = useTheme();
  const uni = universityId ? universitiesById[universityId] : null;
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      }}
    >
      <Avatar url={avatarUrl} name={displayName} size={40} />

      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text
          className="text-[15px] font-sans-semibold text-text-primary"
          numberOfLines={1}
        >
          {displayName}
        </Text>
        <View className="mt-0.5 flex-row items-center gap-2">
          {uni && (
            <Text className="text-xs font-sans-semibold" style={{ color: uni.color }}>
              {uni.short}
            </Text>
          )}
          {typeof albumPct === 'number' && (
            <Text className="text-xs font-sans-medium text-text-tertiary">
              · {Math.round(albumPct)}% del álbum
            </Text>
          )}
        </View>
      </View>

      {rightSlot}
    </Wrapper>
  );
}
