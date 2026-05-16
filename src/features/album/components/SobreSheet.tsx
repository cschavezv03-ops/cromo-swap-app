import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Sheet, useToast } from '@/ui';
import { getDatabase, type CatalogCromoLocal } from '@/features/storage/db';

import { useBulkAddSobre } from '../hooks/useInventoryMutation';

export type SobreSheetHandle = {
  present: () => void;
};

export const SobreSheet = forwardRef<SobreSheetHandle>(function SobreSheet(_, ref) {
  const toast = useToast();
  const inner = useRef<BottomSheetModal>(null);
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const bulk = useBulkAddSobre();

  useImperativeHandle(ref, () => ({
    present: () => {
      setRaw('');
      inner.current?.present();
    },
  }));

  const tokens = parseTokens(raw);

  const handleSubmit = async () => {
    if (tokens.length === 0) return;
    setBusy(true);
    try {
      const db = await getDatabase();
      const pairs: Array<{ cromo_id: string; count: number }> = [];
      for (const t of tokens) {
        const row = await db.getFirstAsync<CatalogCromoLocal>(
          `SELECT * FROM catalog_cromos_local WHERE section_number = ?`,
          [t.number],
        );
        if (!row) continue;
        const existing = pairs.find((p) => p.cromo_id === row.id);
        if (existing) existing.count += t.count;
        else pairs.push({ cromo_id: row.id, count: t.count });
      }
      if (pairs.length === 0) {
        toast.show('No encontramos esos números en el álbum.', 'warning');
        setBusy(false);
        return;
      }
      const added = await bulk.mutateAsync(pairs);
      toast.show(`${added} cromos agregados`, 'success');
      inner.current?.dismiss();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Error agregando sobre.', 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet ref={inner} snapPoints={['55%', '85%']}>
      <View>
        <Text className="text-2xl font-sans-black text-text-primary">Abrir sobre</Text>
        <Text className="mt-1 text-sm text-text-secondary font-sans">
          Ingresá los números del sobre separados por coma o espacio. Repetí o usá ×2 para varios.
        </Text>

        <View className="mt-4 rounded-md border border-border bg-surface px-3 py-2">
          <BottomSheetTextInput
            value={raw}
            onChangeText={setRaw}
            placeholder="012, 18, 18, 044, 102x2, 145"
            placeholderTextColor="#A1A1A9"
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
            multiline
            style={{ minHeight: 80, fontSize: 16, color: '#0B0B0E', fontFamily: 'JetBrainsMono_700Bold' }}
          />
        </View>

        {tokens.length > 0 && (
          <View className="mt-4 flex-row flex-wrap gap-2">
            {tokens.map((t, i) => (
              <View
                key={`${t.number}-${i}`}
                className="rounded-md bg-accent-soft px-3 py-1.5"
              >
                <Text className="text-sm font-sans-semibold text-accent">
                  #{t.number} {t.count > 1 ? `×${t.count}` : ''}
                </Text>
              </View>
            ))}
            <Pressable onPress={() => setRaw('')} hitSlop={6} className="self-center px-2">
              <Text className="text-xs font-sans-medium text-text-tertiary">Limpiar</Text>
            </Pressable>
          </View>
        )}

        <View className="mt-6">
          <Button
            label={`Agregar ${tokens.reduce((s, t) => s + t.count, 0)} cromos`}
            size="lg"
            loading={busy || bulk.isPending}
            disabled={tokens.length === 0 || busy}
            onPress={handleSubmit}
          />
        </View>
      </View>
    </Sheet>
  );
});

/** "12, 18, 18 044 102x2" → [{number:12,count:1},{number:18,count:2},{number:44,count:1},{number:102,count:2}] */
function parseTokens(raw: string): Array<{ number: number; count: number }> {
  const out: Array<{ number: number; count: number }> = [];
  const pieces = raw.split(/[\s,]+/).filter(Boolean);
  for (const p of pieces) {
    const m = p.match(/^(\d{1,4})(?:[xX](\d{1,2}))?$/);
    if (!m) continue;
    const num = parseInt(m[1] ?? '', 10);
    const count = m[2] ? Math.max(1, parseInt(m[2], 10)) : 1;
    if (!Number.isFinite(num)) continue;
    const existing = out.find((t) => t.number === num);
    if (existing) existing.count += count;
    else out.push({ number: num, count });
  }
  return out;
}
