/* eslint-env jest */
// Jest setup file
import '@testing-library/react-native/extend-expect';

global.expo = {
  EventEmitter: class MockEventEmitter {
    addListener() {
      return { remove: jest.fn() };
    }

    removeListener() {}
  },
};

global.localStorage = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

jest.mock('expo-modules-core', () => {
  const actual = jest.requireActual('expo-modules-core');
  class MockNativeResponse {
    addListener() {
      return { remove: jest.fn() };
    }
  }

  return {
    ...actual,
    requireNativeModule: jest.fn((name) => (
      name === 'ExpoFetchModule' ? { NativeResponse: MockNativeResponse } : {}
    )),
    requireOptionalNativeModule: jest.fn(() => null),
  };
});

jest.mock('expo-sqlite/localStorage/install', () => ({}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          then: jest.fn(),
        })),
        insert: jest.fn(() => ({
          then: jest.fn(),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            then: jest.fn(),
          })),
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(() => ({
            then: jest.fn(),
          })),
        })),
      })),
    })),
  })),
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'test-token' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        eas: {},
      },
    },
    manifest: {},
  },
  ExecutionEnvironment: {
    Standalone: 'standalone',
    StoreClient: 'storeClient',
    Web: 'web',
  },
}));

// Mock expo-linking
jest.mock('expo-linking', () => ({
  __esModule: true,
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock expo-localization
jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en', regionCode: 'US' }]),
}));

// Silence console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
