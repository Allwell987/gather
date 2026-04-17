const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      'dist-smoke/**',
      '.expo/*',
      'android/**/build/**',
      'ios/**/build/**',
      'ios/Pods/**',
      'supabase/functions/**',
    ],
  },
]);
