// ESLint config disabled while eslint-config-expo@10 has a peer-dep break with
// the bundled eslint-plugin-react (`contextOrFilename.getFilename is not a function`).
// TypeScript + Prettier still enforce quality. Re-enable when expo bumps it.
module.exports = [
  {
    ignores: ['**/*'],
  },
];
