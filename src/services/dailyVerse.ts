// src/services/dailyVerse.ts
import { supabase } from './supabase';
import { DAILY_VERSE as FALLBACK_VERSE, VERSE_BACKGROUNDS } from '../constants/theme';
import { BIBLE_BOOKS, fetchChapter, getChapterCount } from './bibleApi';
import { format } from 'date-fns';

export interface DailyVerse {
  text: string;
  reference: string;
  backgroundImage?: string;
}

/**
 * Gets a consistent background image for the current day.
 */
function getDailyBackground(): string {
  if (!VERSE_BACKGROUNDS || VERSE_BACKGROUNDS.length === 0) {
    return 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1000';
  }
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const index = Math.abs(dayOfYear) % VERSE_BACKGROUNDS.length;
  return VERSE_BACKGROUNDS[index];
}

function createDailyRandom(seedText: string): () => number {
  let seed = 0;
  for (const character of seedText) {
    seed = (Math.imul(seed, 31) + character.charCodeAt(0)) >>> 0;
  }

  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

/**
 * Selects a stable random Bible verse for the current date.
 * Falls back to the stored or hardcoded verse if the Bible API is unavailable.
 */
export async function fetchDailyVerse(): Promise<DailyVerse> {
  const today = format(new Date(), 'yyyy-MM-dd');

  try {
    const random = createDailyRandom(today);
    const book = BIBLE_BOOKS[Math.floor(random() * BIBLE_BOOKS.length)];
    const chapterNumber = Math.floor(random() * getChapterCount(book)) + 1;
    const chapter = await fetchChapter(book, chapterNumber);

    if (chapter?.verses.length) {
      const verse = chapter.verses[Math.floor(random() * chapter.verses.length)];
      return {
        text: verse.text,
        reference: `${chapter.book} ${chapter.chapter}:${verse.num}`,
        backgroundImage: getDailyBackground(),
      };
    }
  } catch (err) {
    if (__DEV__) {
      console.error('Unexpected error fetching random Bible verse:', err);
    }
  }

  try {
    const { data, error } = await supabase
      .from('daily_verses')
      .select('text, reference')
      .eq('publish_date', today)
      .maybeSingle();

    if (error) {
      if (__DEV__) {
        console.error('Error fetching daily verse:', error);
      }
    } else if (data && typeof data === 'object' && 'text' in data && 'reference' in data) {
      const verse = data as { text: string; reference: string };
      return {
        text: verse.text,
        reference: verse.reference,
        backgroundImage: getDailyBackground(),
      };
    }
  } catch (err) {
    if (__DEV__) {
      console.error('Unexpected error fetching stored daily verse:', err);
    }
  }

  return { ...FALLBACK_VERSE, backgroundImage: getDailyBackground() };
}
