module.exports = function (api) {
  // cache invalidates when NODE_ENV changes (test vs non-test)
  const isTest = api.env('test');
  api.cache.using(() => isTest);

  return {
    presets: [
      [
        'babel-preset-expo',
        // NativeWind v4 needs jsxImportSource at the preset level for Metro,
        // but jest-expo's transformer doesn't process className via NativeWind —
        // so we skip the option in tests to avoid an unused-import edge case.
        isTest ? {} : { jsxImportSource: 'nativewind' },
      ],
    ],
  };
};
