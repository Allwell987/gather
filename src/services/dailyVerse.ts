// src/services/dailyVerse.ts
import { DAILY_VERSE as FALLBACK_VERSE, VERSE_BACKGROUNDS } from '../constants/theme';
import { getDayOfYear, isLeapYear } from 'date-fns';
import DAILY_SCRIPTURES from '../constants/dailyScriptures.json';

export interface DailyVerse {
  text: string;
  reference: string;
  backgroundImage?: string;
}

function getScriptureDay(date: Date): number {
  let day = getDayOfYear(date);
  const isLeapDay = date.getMonth() === 1 && date.getDate() === 29;

  if (isLeapYear(date) && (date.getMonth() > 1 || isLeapDay)) {
    day -= 1;
  }

  return day;
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

/** Selects the scripture assigned to the current calendar day. */
export async function fetchDailyVerse(): Promise<DailyVerse> {
  const scriptureDay = getScriptureDay(new Date());
  const scripture = DAILY_SCRIPTURES[scriptureDay - 1];

  if (!scripture) {
    return { ...FALLBACK_VERSE, backgroundImage: getDailyBackground() };
  }

  return {
    text: scripture.text,
    reference: scripture.reference,
    backgroundImage: getDailyBackground(),
  };
}
