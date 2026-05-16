import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import type { Notification, NotificationPayload } from '../data/notifications';

type Props = {
  notification: Notification;
  onPress: () => void;
  isLast: boolean;
};

/**
 * Devuelve un mapping {emoji, title, subtitle} desde el `kind` y `payload`
 * de la notificación. Mantén en un solo lugar para no spreadear strings.
 */
function describe(notification: Notification): { glyph: string; title: string; subtitle: string } {
  const p = (notification.payload as NotificationPayload) ?? {};
  const name = p.counterparty_name ?? 'Alguien';

  switch (notification.kind) {
    case 'match_new':
      return {
        glyph: '⇄',
        title: 'Nuevo match',
        subtitle: `${name} tiene cromos que te sirven.`,
      };
    case 'match_response':
      return {
        glyph: '✓',
        title: 'Respondieron a tu match',
        subtitle: `${name} ya decidió sobre tu propuesta.`,
      };
    case 'transaction_new':
      return {
        glyph: '✉',
        title: 'Propuesta de intercambio',
        subtitle: `${name} te propuso un intercambio.`,
      };
    case 'transaction_accepted':
      return {
        glyph: '✅',
        title: 'Intercambio aceptado',
        subtitle: `${name} aceptó. Coordina por WhatsApp.`,
      };
    case 'transaction_completed':
      return {
        glyph: '🎉',
        title: 'Intercambio completado',
        subtitle: `Tu álbum se actualizó.`,
      };
    case 'transaction_cancelled':
      return {
        glyph: '✕',
        title: 'Intercambio cancelado',
        subtitle: `${name} canceló o no se completó.`,
      };
    default:
      return {
        glyph: '·',
        title: notification.kind,
        subtitle: '',
      };
  }
}

export function NotificationRow({ notification, onPress, isLast }: Props) {
  const { colors } = useTheme();
  const { glyph, title, subtitle } = describe(notification);
  const unread = !notification.read;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: unread ? `${colors.accent}10` : 'transparent',
        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: unread ? colors.accent : colors.surface,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: unread ? '#FFFFFF' : colors.textPrimary,
          }}
        >
          {glyph}
        </Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: unread ? '700' : '600',
            color: colors.textPrimary,
          }}
        >
          {title}
        </Text>
        {subtitle.length > 0 && (
          <Text
            style={{
              marginTop: 2,
              fontSize: 13,
              color: colors.textSecondary,
              lineHeight: 18,
            }}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        )}
        <Text
          style={{
            marginTop: 4,
            fontSize: 11,
            color: colors.textTertiary,
            fontWeight: '500',
          }}
        >
          {formatRelativeTime(notification.created_at)}
        </Text>
      </View>
      {unread && (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.accent,
            marginTop: 6,
          }}
        />
      )}
    </Pressable>
  );
}

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Hace un momento';
  if (min < 60) return `Hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `Hace ${hr} h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `Hace ${day} d`;
  return new Date(iso).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' });
}
