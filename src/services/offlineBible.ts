// src/services/offlineBible.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import type { BibleChapter, BibleTranslation } from '../types/bible';

const CACHE_KEY = 'bible-cache-v2'; // Bumped version for new structure

interface CacheData {
  [translation: string]: {
    [book: string]: {
      [chapter: number]: BibleChapter;
    };
  };
}

export async function getNetworkState(): Promise<{ isConnected: boolean; type: string | null }> {
  try {
    const state = await Network.getNetworkStateAsync();
    return { isConnected: state.isConnected ?? false, type: state.type ?? null };
  } catch {
    return { isConnected: false, type: null };
  }
}

export async function getCachedChapter(
  book: string,
  chapter: number,
  translation: BibleTranslation = 'kjv'
): Promise<BibleChapter | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const data: CacheData = JSON.parse(cached);
    return data[translation]?.[book]?.[chapter] ?? null;
  } catch {
    return null;
  }
}

export async function cacheChapter(chapter: BibleChapter): Promise<void> {
  try {
    const translation = chapter.translation || 'kjv';
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    const data: CacheData = cached ? JSON.parse(cached) : {};

    if (!data[translation]) data[translation] = {};
    if (!data[translation][chapter.book]) data[translation][chapter.book] = {};

    data[translation][chapter.book][chapter.chapter] = chapter;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to cache chapter:', err);
  }
}

export async function cacheMultipleChapters(chapters: BibleChapter[]): Promise<void> {
  if (chapters.length === 0) return;
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    const data: CacheData = cached ? JSON.parse(cached) : {};

    for (const chapter of chapters) {
      const translation = chapter.translation || 'kjv';
      if (!data[translation]) data[translation] = {};
      if (!data[translation][chapter.book]) data[translation][chapter.book] = {};
      data[translation][chapter.book][chapter.chapter] = chapter;
    }

    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to cache multiple chapters:', err);
  }
}

export async function getDownloadedTranslations(): Promise<BibleTranslation[]> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (!cached) return [];
    const data: CacheData = JSON.parse(cached);
    return Object.keys(data) as BibleTranslation[];
  } catch {
    return [];
  }
}

export async function deleteTranslation(translation: BibleTranslation): Promise<void> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (!cached) return;
    const data: CacheData = JSON.parse(cached);
    delete data[translation];
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to delete translation:', err);
  }
}

export async function initializeOfflineBible(): Promise<void> {
  // We can preload a few essential chapters for first-time users
  const cached = await AsyncStorage.getItem(CACHE_KEY);
  if (!cached) {
    // Initial structure
    const initialData: CacheData = {
      kjv: {
        John: {
          3: {
            book: 'John',
            chapter: 3,
            translation: 'kjv',
            verses: [
              { num: 16, text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' }
            ]
          }
        }
      }
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(initialData));
  }
}
