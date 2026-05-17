import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useProfile } from '@/features/auth/hooks/useProfile';
import { pickAndUploadAvatar } from '@/features/profile/lib/avatar-upload';
import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, useToast } from '@/ui';
import { useQueryClient } from '@tanstack/react-query';

type Props = {
  size?: number;
};

export function AvatarPicker({ size = 96 }: Props) {
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const [busy, setBusy] = useState(false);

  const handlePress = async () => {
    if (!profile?.id || busy) return;
    setBusy(true);
    try {
      const result = await pickAndUploadAvatar(profile.id);
      if (result.cancelled) return;
      await qc.invalidateQueries({ queryKey: ['profile'] });
      await qc.invalidateQueries({ queryKey: ['other-profile'] });
      toast.show('Avatar actualizado.', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo subir la imagen.';
      if (msg.includes('permission')) {
        toast.show('Habilitá el permiso de galería en ajustes.', 'warning');
      } else {
        toast.show(msg, 'danger');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={busy}
      style={{ alignItems: 'center', gap: 8 }}
    >
      <View style={{ position: 'relative' }}>
        <Avatar
          url={profile?.avatar_url ?? null}
          name={profile?.display_name ?? ''}
          size={size}
        />
        <View
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: colors.bg,
          }}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.bg} />
          ) : (
            <Text style={{ color: colors.bg, fontSize: 14 }}>✎</Text>
          )}
        </View>
      </View>
      <Text className="text-xs font-sans-medium text-text-tertiary">
        Tocá para cambiar
      </Text>
    </Pressable>
  );
}
