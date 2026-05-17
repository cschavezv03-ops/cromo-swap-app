import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Sheet, useToast } from '@/ui';

import { useCreateRating } from '../hooks/useRatings';

export type RatingSheetHandle = {
  present: (transactionId: string, counterpartyName: string) => void;
};

type Props = {
  onCreated?: () => void;
};

export const RatingSheet = forwardRef<RatingSheetHandle, Props>(function RatingSheet(
  { onCreated },
  ref,
) {
  const inner = useRef<BottomSheetModal>(null);
  const toast = useToast();
  const { colors } = useTheme();
  const create = useCreateRating();

  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [counterpartyName, setCounterpartyName] = useState<string>('');
  const [stars, setStars] = useState<number>(5);
  const [comment, setComment] = useState<string>('');

  useImperativeHandle(ref, () => ({
    present: (txId, name) => {
      setTransactionId(txId);
      setCounterpartyName(name);
      setStars(5);
      setComment('');
      inner.current?.present();
    },
  }));

  const handleSubmit = async () => {
    if (!transactionId) return;
    try {
      await create.mutateAsync({
        transactionId,
        stars,
        comment: comment.trim() || undefined,
      });
      toast.show('¡Gracias por tu calificación!', 'success');
      inner.current?.dismiss();
      onCreated?.();
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'No se pudo guardar la calificación.',
        'danger',
      );
    }
  };

  return (
    <Sheet ref={inner} snapPoints={['55%']}>
      <View>
        <Text className="text-2xl font-sans-black text-text-primary">
          Califica el intercambio
        </Text>
        <Text className="mt-2 text-sm text-text-secondary font-sans">
          ¿Cómo fue tu experiencia con{' '}
          <Text className="font-sans-semibold text-text-primary">{counterpartyName}</Text>? Tu
          calificación es pública y ayuda a otros usuarios.
        </Text>

        <View className="mt-6 flex-row justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = n <= stars;
            return (
              <Pressable key={n} hitSlop={8} onPress={() => setStars(n)}>
                <Text
                  style={{
                    fontSize: 36,
                    color: filled ? colors.warning : colors.border,
                  }}
                >
                  ★
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text className="mt-2 text-center text-xs font-sans-medium text-text-tertiary">
          {labelForStars(stars)}
        </Text>

        <View className="mt-5 rounded-md border border-border bg-surface px-3 py-2">
          <BottomSheetTextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Cuéntanos cómo te fue (opcional)"
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={280}
            style={{
              minHeight: 56,
              fontSize: 14,
              color: colors.textPrimary,
            }}
          />
        </View>
        <Text className="mt-1 text-right text-[11px] font-sans-medium text-text-tertiary">
          {comment.length}/280
        </Text>

        <View className="mt-5 gap-2">
          <Button
            label="Enviar calificación"
            size="lg"
            loading={create.isPending}
            onPress={handleSubmit}
          />
          <Button
            label="Más tarde"
            variant="ghost"
            onPress={() => inner.current?.dismiss()}
          />
        </View>
      </View>
    </Sheet>
  );
});

function labelForStars(n: number): string {
  switch (n) {
    case 1: return 'Muy mala';
    case 2: return 'Mala';
    case 3: return 'Aceptable';
    case 4: return 'Buena';
    case 5: return 'Excelente';
    default: return '';
  }
}
