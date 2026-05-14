import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { C, spacing } from '@/theme';

/**
 * Bottom tab navigator — 5 tabs in Spanish per design v2.
 * Minimal line icons (24×24) above the label, ink when active, faint otherwise.
 *
 * Non-tab routes (perfil/blocked, profile/[id]) are explicitly hidden via
 * `href: null` so Expo Router doesn't surface them as extra tabs.
 */

type IconProps = { color: string; size?: number };

function AlbumIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3.5" y="4" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.8" />
      <Rect x="13.5" y="4" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.8" />
      <Rect x="3.5" y="13" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.8" />
      <Rect x="13.5" y="13" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

function MatchesIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 7h11l-3-3M17 17H6l3 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MercadoIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.8" />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

function AvisosIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4a5 5 0 00-5 5v3l-2 3h14l-2-3V9a5 5 0 00-5-5zM10 19a2 2 0 004 0"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PerfilIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="3.5" stroke={color} strokeWidth="1.8" />
      <Path
        d="M5 20c0-3.5 3.5-6 7-6s7 2.5 7 6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.ink,
        tabBarInactiveTintColor: C.faint,
        tabBarStyle: {
          backgroundColor: C.paper,
          borderTopColor: C.hairline,
          borderTopWidth: 0.5,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
        tabBarLabelStyle: {
          fontFamily: 'Manrope_700Bold',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          marginTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="album/index"
        options={{
          title: 'Álbum',
          tabBarIcon: ({ color }) => <AlbumIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="matches/index"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color }) => <MatchesIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="mercado/index"
        options={{
          title: 'Mercado',
          tabBarIcon: ({ color }) => <MercadoIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="avisos/index"
        options={{
          title: 'Avisos',
          tabBarIcon: ({ color }) => <AvisosIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil/index"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <PerfilIcon color={color} />,
        }}
      />
      {/* Hidden routes — accessible via navigation but not in the tab bar */}
      <Tabs.Screen name="perfil/blocked" options={{ href: null }} />
    </Tabs>
  );
}
