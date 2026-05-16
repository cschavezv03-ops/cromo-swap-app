import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  FlagDot,
  Input,
  OtpInput,
  ProgressBar,
  ProgressRing,
  Screen,
  ScreenHeader,
  Sheet,
  Skeleton,
  useToast,
} from '@/ui';

if (!__DEV__) {
  // Hide from production routing; users shouldn't see this.
  // expo-router still includes the file; gate by exporting an empty component below.
}

export default function UiPlayground() {
  const router = useRouter();
  const toast = useToast();
  const { mode, override, setOverride } = useTheme();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [otp, setOtp] = useState('');
  const [progress, setProgress] = useState(0.45);

  if (!__DEV__) return null;

  return (
    <Screen>
      <ScreenHeader
        eyebrow="DEV"
        title="UI playground"
        onBack={() => router.back()}
        rightSlot={
          <Chip
            label={mode === 'dark' ? '🌙' : '☀️'}
            onPress={() => setOverride(mode === 'dark' ? 'light' : 'dark')}
          />
        }
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 24 }}>
        <Section title="Buttons">
          <View className="gap-2">
            <Button label="Primary" variant="primary" />
            <Button label="Secondary" variant="secondary" />
            <Button label="Ghost" variant="ghost" />
            <Button label="Danger" variant="danger" />
            <Button label="Loading" loading />
            <View className="flex-row gap-2">
              <Button label="SM" size="sm" />
              <Button label="MD" size="md" />
              <Button label="LG" size="lg" />
            </View>
          </View>
        </Section>

        <Section title="Inputs">
          <View className="gap-3">
            <Input
              label="Email institucional"
              placeholder="tu@usfq.edu.ec"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Input
              label="Contraseña"
              placeholder="Mínimo 8 caracteres"
              secureTextEntry
              helper="Letras, números y un signo recomendado."
            />
            <Input
              label="WhatsApp"
              placeholder="+593 99 ..."
              error="Formato inválido — empieza con +593"
            />
          </View>
        </Section>

        <Section title="OTP">
          <OtpInput length={6} value={otp} onChange={setOtp} />
          <Text className="mt-3 text-center text-sm text-text-tertiary font-sans">
            Valor: {otp || '—'}
          </Text>
        </Section>

        <Section title="Chips">
          <View className="flex-row flex-wrap gap-2">
            <Chip label="Todos" count={240} variant="selected" />
            <Chip label="Faltan" count={102} />
            <Chip label="Repetidos" count={34} />
            <Chip label="Tengo" count={138} variant="outline" />
            <Chip
              label="ARG"
              size="sm"
              leftSlot={<FlagDot code="ARG" color="#6CACE4" accentColor="#74ACDF" size="sm" />}
            />
            <Chip
              label="BRA"
              size="sm"
              leftSlot={<FlagDot code="BRA" color="#FFD200" accentColor="#009B3A" size="sm" />}
            />
          </View>
        </Section>

        <Section title="Cards">
          <View className="gap-2">
            <Card variant="elevated">
              <Text className="text-text-primary font-sans-bold">Elevated</Text>
              <Text className="text-text-secondary font-sans">Para contenido principal.</Text>
            </Card>
            <Card variant="flat">
              <Text className="text-text-primary font-sans-bold">Flat</Text>
              <Text className="text-text-secondary font-sans">Para listas y filas.</Text>
            </Card>
            <Card variant="outline">
              <Text className="text-text-primary font-sans-bold">Outline</Text>
              <Text className="text-text-secondary font-sans">Para selectables.</Text>
            </Card>
          </View>
        </Section>

        <Section title="Progress">
          <View className="flex-row items-center gap-4">
            <ProgressRing value={progress} size={64} />
            <View className="flex-1">
              <Text className="text-sm text-text-secondary font-sans-medium">
                {Math.round(progress * 100)}% del álbum
              </Text>
              <View className="mt-2">
                <ProgressBar value={progress} />
              </View>
              <View className="mt-3 flex-row gap-2">
                <Button label="-10%" size="sm" variant="secondary" onPress={() => setProgress((p) => Math.max(0, p - 0.1))} />
                <Button label="+10%" size="sm" variant="secondary" onPress={() => setProgress((p) => Math.min(1, p + 0.1))} />
              </View>
            </View>
          </View>
        </Section>

        <Section title="Skeleton">
          <View className="gap-2">
            <Skeleton width={'60%'} height={20} />
            <Skeleton width={'40%'} height={14} />
            <View className="mt-3 flex-row gap-2">
              <Skeleton width={80} height={120} rounded="md" />
              <Skeleton width={80} height={120} rounded="md" />
              <Skeleton width={80} height={120} rounded="md" />
            </View>
          </View>
        </Section>

        <Section title="Sheet + Toast">
          <View className="gap-2">
            <Button label="Abrir sheet" variant="secondary" onPress={() => sheetRef.current?.present()} />
            <Button label="Mostrar toast (info)" variant="ghost" onPress={() => toast.show('Hola desde un toast')} />
            <Button label="Toast success" variant="ghost" onPress={() => toast.show('Cromo agregado', 'success')} />
            <Button label="Toast danger" variant="ghost" onPress={() => toast.show('Algo falló', 'danger')} />
          </View>
        </Section>

        <Section title="Empty state">
          <Card variant="outline">
            <EmptyState
              title="Sin matches todavía"
              description="Agrega cromos repetidos para empezar a encontrar intercambios en tu universidad."
              action={<Button label="Ir al álbum" />}
            />
          </Card>
        </Section>

        <Section title="Theme">
          <View className="flex-row gap-2">
            <Button
              label="Sistema"
              variant={override === null ? 'primary' : 'secondary'}
              onPress={() => setOverride(null)}
            />
            <Button
              label="Light"
              variant={override === 'light' ? 'primary' : 'secondary'}
              onPress={() => setOverride('light')}
            />
            <Button
              label="Dark"
              variant={override === 'dark' ? 'primary' : 'secondary'}
              onPress={() => setOverride('dark')}
            />
          </View>
        </Section>
      </ScrollView>

      <Sheet ref={sheetRef} snapPoints={['40%', '75%']}>
        <Text className="text-text-primary text-2xl font-sans-bold">Bottom sheet</Text>
        <Text className="mt-2 text-text-secondary font-sans">
          Esto es un sheet sobre el sistema de diseño. Pull down para cerrar.
        </Text>
        <View className="mt-4 gap-2">
          <Button label="Acción primaria" />
          <Button label="Cerrar" variant="ghost" onPress={() => sheetRef.current?.dismiss()} />
        </View>
      </Sheet>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="mb-3 text-xs font-sans-semibold uppercase tracking-wider text-text-tertiary">
        {title}
      </Text>
      {children}
    </View>
  );
}
