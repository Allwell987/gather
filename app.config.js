const baseConfig = {
  name: 'Gather',
  slug: 'gather-twrc',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#000000',
  },
  assetBundlePatterns: ['**/*'],
  runtimeVersion: '1.0.0',
  updates: {
    url: 'https://u.expo.dev/33325d84-541e-4330-8a9d-09e1ed6eafec',
  },
  ios: {
    supportsTablet: false,
    usesAppleSignIn: true,
    bundleIdentifier: 'com.wealthrealitychurch.gather',
    infoPlist: {
      CFBundleAllowMixedLocalizations: true,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1e140a',
    },
    package: 'com.wealthrealitychurch.gather',
    googleServicesFile: './android/app/google-services.json',
    permissions: ['RECEIVE_BOOT_COMPLETED', 'VIBRATE'],
    blockedPermissions: [
      'android.permission.CAMERA',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
  },
  plugins: [
    'expo-apple-authentication',
    'expo-font',
    'expo-secure-store',
    'expo-web-browser',
    [
      'expo-image-picker',
      {
        photosPermission: 'Gather uses your photos so you can choose a profile picture.',
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#1a56db',
      },
    ],
  ],
  scheme: 'gather',
  extra: {
    eas: {
      projectId: '33325d84-541e-4330-8a9d-09e1ed6eafec',
    },
  },
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getValidProjectId() {
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();

  if (!projectId || !UUID_REGEX.test(projectId)) {
    return undefined;
  }

  return projectId;
}

module.exports = () => {
  const extra = { ...(baseConfig.extra ?? {}) };
  const eas = { ...(extra.eas ?? {}) };
  const projectId = getValidProjectId();

  if (projectId) {
    eas.projectId = projectId;
  }

  if (Object.keys(eas).length > 0) {
    extra.eas = eas;
  } else {
    delete extra.eas;
  }

  return {
    ...baseConfig,
    extra,
  };
};
