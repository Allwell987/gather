// src/services/offlineBible.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import type { BibleChapter, BibleTranslation } from '../types/bible';

const INDEX_KEY = 'bible-index-v1';

interface BibleIndex {
  downloaded: {
    [translation: string]: string[]; // list of book names
  };
}

const getChapterKey = (translation: string, book: string, chapter: number) =>
  `bible:${translation}:${book.toLowerCase().replace(/\s+/g, '_')}:${chapter}`;

export async function getNetworkState(): Promise<{ isConnected: boolean; type: string | null }> {
  try {
    const state = await Network.getNetworkStateAsync();
    return { isConnected: state.isConnected ?? false, type: state.type ?? null };
  } catch {
    return { isConnected: false, type: null };
  }
}

async function updateIndex(translation: string, book: string) {
  try {
    const rawIndex = await AsyncStorage.getItem(INDEX_KEY);
    const index: BibleIndex = rawIndex ? JSON.parse(rawIndex) : { downloaded: {} };

    if (!index.downloaded[translation]) {
      index.downloaded[translation] = [];
    }

    if (!index.downloaded[translation].includes(book)) {
      index.downloaded[translation].push(book);
      await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index));
    }
  } catch (err) {
    console.error('Failed to update bible index:', err);
  }
}

export async function getCachedChapter(
  book: string,
  chapter: number,
  translation: BibleTranslation = 'kjv'
): Promise<BibleChapter | null> {
  try {
    const key = getChapterKey(translation, book, chapter);
    const cached = await AsyncStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

export async function cacheChapter(chapter: BibleChapter): Promise<void> {
  try {
    const translation = chapter.translation || 'kjv';
    const key = getChapterKey(translation, chapter.book, chapter.chapter);
    await AsyncStorage.setItem(key, JSON.stringify(chapter));
    await updateIndex(translation, chapter.book);
  } catch (err) {
    console.error('Failed to cache chapter:', err);
  }
}

export async function cacheMultipleChapters(chapters: BibleChapter[]): Promise<void> {
  if (chapters.length === 0) return;
  try {
    const translation = chapters[0].translation || 'kjv';
    const book = chapters[0].book;

    // Use multiSet for efficiency
    const pairs: [string, string][] = chapters.map(ch => [
      getChapterKey(translation, ch.book, ch.chapter),
      JSON.stringify(ch)
    ]);

    await AsyncStorage.multiSet(pairs);
    await updateIndex(translation, book);
  } catch (err) {
    console.error('Failed to cache multiple chapters:', err);
  }
}

export async function getDownloadedTranslations(): Promise<BibleTranslation[]> {
  try {
    const rawIndex = await AsyncStorage.getItem(INDEX_KEY);
    if (!rawIndex) return [];
    const index: BibleIndex = JSON.parse(rawIndex);
    return Object.keys(index.downloaded) as BibleTranslation[];
  } catch {
    return [];
  }
}

export async function deleteTranslation(translation: BibleTranslation): Promise<void> {
  try {
    const rawIndex = await AsyncStorage.getItem(INDEX_KEY);
    if (!rawIndex) return;
    const index: BibleIndex = JSON.parse(rawIndex);

    const books = index.downloaded[translation] || [];
    const keysToDelete: string[] = [];

    // This is a bit expensive if we don't know the chapter counts,
    // but we can scan all keys starting with bible:translation:
    const allKeys = await AsyncStorage.getAllKeys();
    const translationPrefix = `bible:${translation}:`;
    const targetKeys = allKeys.filter(k => k.startsWith(translationPrefix));

    await AsyncStorage.multiRemove(targetKeys);

    delete index.downloaded[translation];
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch (err) {
    console.error('Failed to delete translation:', err);
  }
}

export async function initializeOfflineBible(): Promise<void> {
  const rawIndex = await AsyncStorage.getItem(INDEX_KEY);
  if (!rawIndex) {
    const chapter = {
      book: 'John',
      chapter: 3,
      translation: 'kjv',
      verses: [
        { num: 16, text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' }
      ]
    };
    await cacheChapter(chapter as BibleChapter);
  }
}
