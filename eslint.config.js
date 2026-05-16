const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['node_modules', 'android', 'ios', 'dist', '.expo'],
  },
  {
    rules: {
      'react/no-unescaped-entities': 'off',
    },
  },
];
