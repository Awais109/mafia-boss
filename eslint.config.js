// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'sim/out/*'],
  },
  {
    // The one rule (plan §2.1): engine/ is pure TypeScript. No React, no Expo,
    // no imports from app/ or sim/, no Date.now(), no Math.random().
    files: ['engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/app', '**/app/**', '**/sim', '**/sim/**'], message: 'engine/ must not import from app/ or sim/.' },
            { group: ['react', 'react-*', 'react-native', 'react-native/**', 'expo', 'expo-*', '@expo/**'], message: 'engine/ is pure TypeScript.' },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'Inject time: engine functions take nowMs.' },
        { object: 'Math', property: 'random', message: 'Use engine/core/rng.' },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "NewExpression[callee.name='Date']", message: 'Inject time: engine functions take nowMs.' },
      ],
    },
  },
]);
