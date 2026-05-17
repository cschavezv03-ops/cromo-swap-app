import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  AlbumIcon,
  AvisosIcon,
  MatchesIcon,
  MercadoIcon,
  PerfilIcon,
} from '@/ui/icons/TabBarIcons';

type IconRender = (focused: boolean, color: string) => React.ReactNode;
type TabItem = {
  name: 'album' | 'matches' | 'mercado' | 'avisos' | 'perfil';
  label: string;
  icon: IconRender;
};

const TABS: TabItem[] = [
  { name: 'album',   label: 'Álbum',   icon: (_f, c) => <AlbumIcon   color={c} /> },
  { name: 'matches', label: 'Matches', icon: (_f, c) => <MatchesIcon color={c} /> },
  { name: 'mercado', label: 'Mercado', icon: (_f, c) => <MercadoIcon color={c} /> },
  { name: 'avisos',  label: 'Avisos',  icon: (_f, c) => <AvisosIcon  color={c} /> },
  { name: 'perfil',  label: 'Perfil',  icon: (_f, c) => <PerfilIcon  color={c} /> },
];

function TabContent({ focused, label, icon }: { focused: boolean; label: string; icon: IconRender }) {
  const { colors } = useTheme();
  const tint = focused ? colors.textPrimary : colors.textTertiary;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 64, paddingTop: 6 }}>
      {icon(focused, tint)}
      <Text
        numberOfLines={1}
        style={{
          marginTop: 4,
          fontSize: 10,
          fontWeight: focused ? '600' : '500',
          color: tint,
          letterSpacing: 0.1,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          marginTop: 3,
          height: 2,
          width: focused ? 14 : 0,
          borderRadius: 1,
          backgroundColor: colors.textPrimary,
        }}
      />
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          height: 70,
          paddingTop: 4,
          paddingBottom: 10,
          elevation: 0,
        },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabContent focused={focused} label={t.label} icon={t.icon} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
