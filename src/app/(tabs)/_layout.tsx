import React from 'react';
import { Tabs } from 'expo-router';
import { C } from '@/theme';

/**
 * Bottom tab navigator — 5 tabs in Spanish as per design spec.
 * Icons are placeholder characters; final icons are Phase 4+ (ui-ux-pro-max skill).
 */
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
        },
        tabBarLabelStyle: {
          fontFamily: 'Manrope_700Bold',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="album/index"
        options={{
          title: 'Álbum',
          tabBarIcon: ({ color }) => null,
        }}
      />
      <Tabs.Screen
        name="matches/index"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color }) => null,
        }}
      />
      <Tabs.Screen
        name="mercado/index"
        options={{
          title: 'Mercado',
          tabBarIcon: ({ color }) => null,
        }}
      />
      <Tabs.Screen
        name="avisos/index"
        options={{
          title: 'Avisos',
          tabBarIcon: ({ color }) => null,
        }}
      />
      <Tabs.Screen
        name="perfil/index"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => null,
        }}
      />
    </Tabs>
  );
}
