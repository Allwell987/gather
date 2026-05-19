module.exports = {
  extends: 'expo',
  env: {
    node: true,
  },
  ignorePatterns: [
    'dist/*',
    'dist-smoke/**',
    '.expo/*',
    'android/**',
    'ios/**',
    'node_modules/**',
    'supabase/functions/**',
  ],
};
