import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/ui';

export default function Index() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-xs font-sans-semibold uppercase tracking-[0.2em] text-text-tertiary">
          Mundial 2026
        </Text>
        <Text className="mt-3 text-4xl font-sans-black text-text-primary">Cromo Swap</Text>
        <Text className="mt-4 max-w-xs text-center text-base text-text-secondary font-sans">
          App en construcción. Pronto vas a poder coleccionar, intercambiar y conectarte con tu
          universidad.
        </Text>
        {__DEV__ && (
          <Link href="/dev/ui" className="mt-10 text-accent font-sans-semibold">
            → Abrir playground de UI (dev)
          </Link>
        )}
      </View>
    </Screen>
  );
}
