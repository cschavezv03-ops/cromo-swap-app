import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Cromo Swap',
  slug: 'cromo-swap-app',
  owner: 'daxrpm',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'cromoswap',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0B0B0E',
  },
  assetBundlePatterns: ['**/*'],
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0B0B0E',
    },
    package: 'app.cromoswap.mobile',
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'cromoswap', host: 'auth' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'app.cromoswap.mobile',
    infoPlist: {
      // Necesario para que Linking.canOpenURL pueda detectar apps de correo
      // instaladas en iOS y abrir su INBOX (no componer un mensaje nuevo).
      LSApplicationQueriesSchemes: [
        'googlegmail',
        'ms-outlook',
        'ymail',
        'protonmail',
        'message',
      ],
    },
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-sqlite',
    'expo-font',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0B0B0E',
        image: './assets/splash.png',
        resizeMode: 'contain',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'La app necesita acceder a tu galería para subir tu avatar.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#0B0B0E',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: 'ee6b2285-ae43-4150-bb46-65f4b4487db4',
    },
    posthogProjectToken: process.env.POSTHOG_PROJECT_TOKEN,
    posthogHost: process.env.POSTHOG_HOST,
  },
};

export default config;
