import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

type IconProps = { focused: boolean; label: string };

function TabIcon({ focused, label }: IconProps) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: focused ? '700' : '500',
          color: focused ? colors.textPrimary : colors.textTertiary,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          height: 64,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="album"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Álbum" />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Matches" />,
        }}
      />
      <Tabs.Screen
        name="mercado"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Mercado" />,
        }}
      />
      <Tabs.Screen
        name="avisos"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Avisos" />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Perfil" />,
        }}
      />
    </Tabs>
  );
}
