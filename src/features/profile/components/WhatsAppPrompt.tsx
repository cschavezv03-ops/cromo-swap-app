import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { isValidE164, normalizeEcuadorPhone } from '@/shared/utils/whatsapp';
import { Button, Input, Sheet, useToast } from '@/ui';

import { useSetMyWhatsApp } from '../hooks/useWhatsApp';

export type WhatsAppPromptHandle = {
  /** Abre el sheet y, al guardar con éxito, dispara `onComplete`. */
  present: (opts?: { onComplete?: () => void; onCancel?: () => void }) => void;
  dismiss: () => void;
};

export const WhatsAppPrompt = forwardRef<WhatsAppPromptHandle>(function WhatsAppPrompt(_, ref) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const onCompleteRef = useRef<(() => void) | undefined>(undefined);
  const onCancelRef = useRef<(() => void) | undefined>(undefined);

  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const setMutation = useSetMyWhatsApp();
  const toast = useToast();

  useImperativeHandle(ref, () => ({
    present: (opts) => {
      onCompleteRef.current = opts?.onComplete;
      onCancelRef.current = opts?.onCancel;
      setRaw('');
      setError(null);
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleSave = async () => {
    const normalized = normalizeEcuadorPhone(raw);
    if (!isValidE164(normalized)) {
      setError('Ingresa un número válido. Ejemplo: 0987654321 o +593987654321.');
      return;
    }
    setError(null);
    try {
      await setMutation.mutateAsync(normalized);
      toast.show('WhatsApp guardado.', 'success');
      onCompleteRef.current?.();
      sheetRef.current?.dismiss();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo guardar el número.';
      setError(msg);
    }
  };

  const handleCancel = () => {
    onCancelRef.current?.();
    sheetRef.current?.dismiss();
  };

  return (
    <Sheet ref={sheetRef} snapPoints={['55%']}>
      <View>
        <Text className="text-xs font-sans-semibold uppercase tracking-wider text-text-tertiary">
          Contacto
        </Text>
        <Text className="mt-2 text-2xl font-sans-black text-text-primary">
          Necesitamos tu WhatsApp
        </Text>
        <Text className="mt-2 text-sm font-sans text-text-secondary">
          La otra persona podrá contactarte por WhatsApp solo cuando aceptes el
          intercambio. Tu número se mantiene privado hasta entonces.
        </Text>

        <View className="mt-6">
          <Input
            label="Número de WhatsApp"
            placeholder="987654321"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            value={raw}
            onChangeText={(t) => {
              setRaw(t);
              if (error) setError(null);
            }}
            error={error ?? undefined}
            helper="Si no escribes el código de país, usamos +593 (Ecuador)."
            leftSlot={
              <Text className="mr-2 text-base font-sans-semibold text-text-secondary">
                +593
              </Text>
            }
          />
        </View>

        <View className="mt-6 gap-3">
          <Button
            label="Guardar y continuar"
            size="lg"
            loading={setMutation.isPending}
            disabled={setMutation.isPending || raw.trim().length === 0}
            onPress={handleSave}
          />
          <Button
            label="Cancelar"
            variant="ghost"
            size="md"
            disabled={setMutation.isPending}
            onPress={handleCancel}
          />
        </View>
      </View>
    </Sheet>
  );
});
