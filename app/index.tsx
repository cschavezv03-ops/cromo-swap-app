import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Index() {
  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-text-tertiary text-xs font-sans-semibold uppercase tracking-[0.2em]">
          Mundial 2026
        </Text>
        <Text className="mt-2 text-text-primary text-4xl font-sans-black">Cromo Swap</Text>
        <Text className="mt-4 text-text-secondary text-base font-sans text-center">
          App en construcción. Pronto vas a poder coleccionar, intercambiar y conectarte con tu
          universidad.
        </Text>
      </View>
    </SafeAreaView>
  );
}
