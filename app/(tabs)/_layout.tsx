import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/shared/ui';

function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return (
    <View className="h-6 w-6 items-center justify-center">
      <Text
        style={{ opacity: focused ? 1 : 0.55 }}
        className="text-base"
      >
        {glyph}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E0D2',
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#15140F',
        tabBarInactiveTintColor: '#7A766B',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="album"
        options={{
          title: 'Álbum',
          tabBarIcon: ({ focused }) => <TabIcon glyph="◧" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ focused }) => <TabIcon glyph="⇄" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="mercado"
        options={{
          title: 'Mercado',
          tabBarIcon: ({ focused }) => <TabIcon glyph="🛍" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="avisos"
        options={{
          title: 'Avisos',
          tabBarIcon: ({ focused }) => <TabIcon glyph="◔" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => <TabIcon glyph="◉" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
