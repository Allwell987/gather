const { execSync } = require('child_process');
const { existsSync, mkdirSync } = require('fs');
const { join } = require('path');

const pluginApplePath = join(__dirname, '..', 'node_modules', '@expo', 'expo-modules-macros-plugin', 'apple');
const buildScriptPath = join(pluginApplePath, 'build.js');

if (process.platform !== 'darwin') {
  console.warn('Skipping ExpoModulesMacros plugin rebuild on non-macOS platform.');
  process.exit(0);
}

if (!existsSync(pluginApplePath)) {
  console.warn('Skipping ExpoModulesMacros plugin rebuild: path not found:', pluginApplePath);
  process.exit(0);
}

if (!existsSync(buildScriptPath)) {
  console.warn('Skipping ExpoModulesMacros plugin rebuild: build script not found:', buildScriptPath);
  process.exit(0);
}

try {
  console.log('Rebuilding ExpoModulesMacros plugin tool from source...');
  // Swift macros are host executables. Rebuild this tool with the same Xcode
  // toolchain that will compile the iOS pods (including on EAS's Intel hosts).
  // Keep Swift's module cache in the workspace so sandboxed/local installs do
  // not fail trying to write to a protected home-directory cache.
  const moduleCachePath = join(pluginApplePath, '.module-cache');
  mkdirSync(moduleCachePath, { recursive: true });
  execSync('node build.js', {
    cwd: pluginApplePath,
    stdio: 'inherit',
    env: {
      ...process.env,
      CLANG_MODULE_CACHE_PATH: moduleCachePath,
      SWIFTPM_MODULECACHE_OVERRIDE: moduleCachePath,
    },
  });
  console.log('ExpoModulesMacros tool rebuilt successfully.');
} catch (error) {
  console.error('Failed to rebuild ExpoModulesMacros plugin tool:', error.message);
  process.exit(1);
}
