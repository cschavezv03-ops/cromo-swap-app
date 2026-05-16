import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Sheet, useToast } from '@/ui';

import { useBlockUser } from '../hooks/useBlocks';

export type BlockSheetHandle = {
  present: (targetUserId: string, displayName: string) => void;
};

export const BlockSheet = forwardRef<BlockSheetHandle, { onBlocked?: () => void }>(
  function BlockSheet({ onBlocked }, ref) {
    const toast = useToast();
    const inner = useRef<BottomSheetModal>(null);
    const block = useBlockUser();
    const [target, setTarget] = useState<{ id: string; name: string } | null>(null);

    useImperativeHandle(ref, () => ({
      present: (id, name) => {
        setTarget({ id, name });
        inner.current?.present();
      },
    }));

    const handleConfirm = async () => {
      if (!target) return;
      try {
        await block.mutateAsync(target.id);
        toast.show(`Bloqueaste a ${target.name}.`, 'success');
        inner.current?.dismiss();
        onBlocked?.();
      } catch (err) {
        toast.show(
          err instanceof Error ? err.message : 'No se pudo bloquear al usuario.',
          'danger',
        );
      }
    };

    return (
      <Sheet ref={inner} snapPoints={['38%']}>
        <View>
          <Text className="text-2xl font-sans-black text-text-primary">
            ¿Bloquear a {target?.name}?
          </Text>
          <Text className="mt-3 text-sm text-text-secondary font-sans leading-[20px]">
            No verá tu perfil ni tus publicaciones. Tampoco aparecerá en tus matches ni podrá
            proponerte intercambios. Puedes desbloquearlo en cualquier momento desde tu perfil.
          </Text>

          <View className="mt-6 gap-2">
            <Button
              label="Bloquear"
              variant="danger"
              loading={block.isPending}
              onPress={handleConfirm}
            />
            <Button label="Cancelar" variant="ghost" onPress={() => inner.current?.dismiss()} />
          </View>
        </View>
      </Sheet>
    );
  },
);
