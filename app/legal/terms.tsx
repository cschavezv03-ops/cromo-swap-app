import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { LegalText } from '@/features/legal/components/LegalText';
import { TERMS_TEXT } from '@/features/legal/content';
import { Screen, ScreenHeader } from '@/ui';

export default function TermsScreen() {
  const router = useRouter();
  return (
    <Screen>
      <ScreenHeader title="Términos" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator
      >
        <View>
          <LegalText source={TERMS_TEXT} />
        </View>
      </ScrollView>
    </Screen>
  );
}
