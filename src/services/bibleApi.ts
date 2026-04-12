// src/services/bibleApi.ts
import type { BibleChapter, BibleVerse, BibleTranslation } from '../types/bible';

const API_BASE = 'https://bible-api.com';

interface APIVerse {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

interface APIResponse {
  reference: string;
  verses: APIVerse[];
  translation_id: string;
  translation_name: string;
  translation_note: string;
  error?: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(ms > 0 ? resolve : () => resolve(null), ms));

/**
 * Bible-api.com is case-sensitive and picky about book names in URLs.
 * This helper ensures book names are formatted correctly for their API.
 */
const formatBookForUrl = (book: string): string => {
  // bible-api.com handles "John" as "john", "1 John" as "1 john", etc.
  // The spaces are usually okay if encoded, but some names need special care.
  return book.trim().toLowerCase();
};

export async function fetchChapter(
  book: string,
  chapter: number,
  translation: BibleTranslation = 'kjv',
  retries = 3
): Promise<BibleChapter | null> {
  try {
    // Some translations (like NIV, MSG, NLT) are NOT supported by bible-api.com.
    // They only support open-source ones like KJV, WEB, BBE, etc.
    const supportedTranslations = ['kjv', 'bbe', 'web', 'webbe', 'oeb-cw', 'oeb-us', 'almeida', 'rvr09'];
    const apiTranslation = supportedTranslations.includes(translation) ? translation : 'kjv';

    const bookSlug = encodeURIComponent(formatBookForUrl(book));
    const url = `${API_BASE}/${bookSlug}%20${chapter}?translation=${apiTranslation}`;

    console.log(`Fetching Bible: ${url}`);
    const response = await fetch(url);
    
    if (response.status === 429 && retries > 0) {
      const waitTime = (4 - retries) * 2000;
      console.warn(`Bible API rate limited (429). Retrying in ${waitTime}ms...`);
      await delay(waitTime);
      return fetchChapter(book, chapter, translation, retries - 1);
    }

    if (response.status === 404) {
      console.error(`Bible API 404: Book "${book}" or Chapter ${chapter} not found.`);
      return null;
    }

    if (!response.ok) {
      console.error('Bible API error:', response.status);
      return null;
    }

    const data: APIResponse = await response.json();
    
    if (data.error) {
      console.error('Bible API error message:', data.error);
      return null;
    }

    if (!data.verses || data.verses.length === 0) {
      console.error('Bible API error: No verses returned');
      return null;
    }

    const verses: BibleVerse[] = data.verses.map((v) => ({
      num: v.verse,
      text: v.text.trim(),
    }));

    return {
      book: data.verses[0].book_name,
      chapter,
      verses,
      translation: data.translation_id as BibleTranslation,
    };
  } catch (err) {
    console.error('Failed to fetch Bible chapter:', err);
    if (retries > 0) {
      await delay(1000);
      return fetchChapter(book, chapter, translation, retries - 1);
    }
    return null;
  }
}

export async function fetchFullBook(
  book: string,
  translation: BibleTranslation = 'kjv',
  onProgress?: (chapter: number, total: number) => void
): Promise<BibleChapter[]> {
  const chapters: BibleChapter[] = [];
  const totalChapters = getChapterCount(book as any);

  for (let i = 1; i <= totalChapters; i++) {
    const data = await fetchChapter(book, i, translation);
    if (data) {
      chapters.push(data);
    }
    if (onProgress) onProgress(i, totalChapters);

    if (i < totalChapters) {
      await delay(300);
    }
  }

  return chapters;
}

export const BIBLE_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
  'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
  'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John',
  'Acts', 'Romans', '1 Corinthians', '2 Corinthians',
  'Galatians', 'Ephesians', 'Philippians', 'Colossians',
  '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy',
  'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude',
  'Revelation',
] as const;

export type BibleBook = typeof BIBLE_BOOKS[number];

export function getChapterCount(book: BibleBook): number {
  const counts: Record<string, number> = {
    Genesis: 50, Exodus: 40, Leviticus: 27, Numbers: 36, Deuteronomy: 34,
    Joshua: 24, Judges: 21, Ruth: 4, '1 Samuel': 31, '2 Samuel': 24,
    '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36,
    Ezra: 10, Nehemiah: 13, Esther: 10, Job: 42, Psalms: 150,
    Proverbs: 31, Ecclesiastes: 12, 'Song of Solomon': 8,
    Isaiah: 66, Jeremiah: 52, Lamentations: 5, Ezekiel: 48, Daniel: 12,
    Hosea: 14, Joel: 3, Amos: 9, Obadiah: 1, Jonah: 4,
    Micah: 7, Nahum: 3, Habakkuk: 3, Zephaniah: 3, Haggai: 2,
    Zechariah: 14, Malachi: 4,
    Matthew: 28, Mark: 16, Luke: 24, John: 21,
    Acts: 28, Romans: 16, '1 Corinthians': 16, '2 Corinthians': 13,
    Galatians: 6, Ephesians: 6, Philippians: 4, Colossians: 4,
    '1 Thessalonians': 5, '2 Thessalonians': 3, '1 Timothy': 6, '2 Timothy': 4,
    Titus: 3, Philemon: 1, Hebrews: 13, James: 5,
    '1 Peter': 5, '2 Peter': 3, '1 John': 5, '2 John': 1, '3 John': 1, Jude: 1,
    Revelation: 22,
  };
  return counts[book] ?? 1;
}
