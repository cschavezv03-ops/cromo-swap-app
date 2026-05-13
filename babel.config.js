module.exports = function (api) {
  // cache invalidates when NODE_ENV changes (test vs non-test)
  const isTest = api.env('test');
  api.cache.using(() => isTest);

  const config = {
    presets: [
      [
        'babel-preset-expo',
        isTest ? {} : { jsxImportSource: 'nativewind' },
      ],
    ],
    plugins: [],
  };

  // nativewind/babel is a bundler (Metro) plugin — skip it in Jest
  if (!isTest) {
    config.plugins.push('nativewind/babel');
  }

  return config;
};
