import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Cromos',
  slug: 'cromo-swap-app',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'cromos',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    resizeMode: 'contain',
    backgroundColor: '#F7F4ED',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'ec.cromos.app',
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: 'ec.cromos.app',
    edgeToEdgeEnabled: true,
  },
  web: {
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl:
      process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://wpcnqfyfcnebtmxstcpo.supabase.co',
    // Publishable keys are designed for public client embedding (like Stripe pk_*).
    // Replace with your project's publishable key if you fork this repo.
    supabaseAnonKey:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
      'sb_publishable_9rvnmCd7Lu4_0g1TtWrPZw_JQ_X169R',
  },
};

export default config;
