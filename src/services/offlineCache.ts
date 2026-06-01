import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatAppDate, formatAppTime, getDeviceLocale, t } from './locale';

export interface OfflineCacheEntry<T> {
  data: T;
  updatedAt: string;
  expiresAt?: string;
}

const getCacheKey = (key: string) => `offline-cache:${key}`;
const DEFAULT_OFFLINE_CACHE_TTL_MS = 1000 * 60 * 60 * 24;

export const readOfflineCache = async <T>(key: string): Promise<OfflineCacheEntry<T> | null> => {
  try {
    const storageKey = getCacheKey(key);
    const rawValue = await AsyncStorage.getItem(storageKey);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as OfflineCacheEntry<T>;

    if (!parsed.expiresAt) {
      return parsed;
    }

    const expiresAtMs = new Date(parsed.expiresAt).getTime();

    if (Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now()) {
      await AsyncStorage.removeItem(storageKey);
      return null;
    }

    return parsed;
  } catch (error) {
    if (__DEV__) {
      console.error(`Failed to read offline cache for ${key}:`, error);
    }
    return null;
  }
};

export const writeOfflineCache = async <T>(
  key: string,
  data: T,
  ttlMs = DEFAULT_OFFLINE_CACHE_TTL_MS
) => {
  try {
    const nowMs = Date.now();
    const payload: OfflineCacheEntry<T> = {
      data,
      updatedAt: new Date(nowMs).toISOString(),
      expiresAt: new Date(nowMs + ttlMs).toISOString(),
    };

    await AsyncStorage.setItem(getCacheKey(key), JSON.stringify(payload));
  } catch (error) {
    if (__DEV__) {
      console.error(`Failed to write offline cache for ${key}:`, error);
    }
  }
};

export const formatOfflineTimestamp = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const locale = getDeviceLocale();
  const dateString = formatAppDate(date, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }, locale);
  const timeString = formatAppTime(date, {
    hour: 'numeric',
    minute: '2-digit',
  }, locale);

  return t('savedAtPhrase', locale)
    .replace('{date}', dateString)
    .replace('{time}', timeString);
};
