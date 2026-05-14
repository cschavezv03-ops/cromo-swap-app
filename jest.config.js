module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      '(jest-)?react-native' +
      '|@react-native(-community)?' +
      '|expo(nent)?' +
      '|expo-font' +
      '|expo-modules-core' +
      '|expo-crypto' +
      '|expo-splash-screen' +
      '|expo-secure-store' +
      '|@expo(-google-fonts)?' +
      '|@expo/vector-icons' +
      '|react-navigation' +
      '|@react-navigation/.*' +
      '|@unimodules/.*' +
      '|unimodules' +
      '|sentry-expo' +
      '|native-base' +
      '|react-native-svg' +
      '|nativewind' +
      '|@supabase/.*' +
      '|aes-js' +
      ')/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
