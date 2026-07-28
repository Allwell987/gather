// src/services/dailyVerse.ts
import { supabase } from './supabase';
import { DAILY_VERSE as FALLBACK_VERSE, VERSE_BACKGROUNDS } from '../constants/theme';
import { fetchVerseText } from './bibleApi';

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

/**
 * Fetches the verse of the day for the current date.
 * Prioritizes the anchor scripture from today's devotional.
 * Falls back to the hardcoded DAILY_VERSE if none is found for today.
 */
export async function fetchDailyVerse(): Promise<DailyVerse> {
  const today = new Date().toISOString().split('T')[0];

  try {
    // 1. Try to fetch today's devotional first
    const { data: devotional, error: devoError } = await supabase
      .from('devotionals')
      .select('anchor_scripture')
      .lte('publish_date', today)
      .order('publish_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!devoError && (devotional as any)?.anchor_scripture) {
      const reference = (devotional as any).anchor_scripture;

      // 2. Check if we already have the text in daily_verses for this reference
      const { data: existingVerse } = await supabase
        .from('daily_verses')
        .select('text')
        .eq('reference', reference)
        .limit(1)
        .maybeSingle();

      if ((existingVerse as any)?.text) {
        return {
          text: (existingVerse as any).text,
          reference,
          backgroundImage: getDailyBackground(),
        };
      }

      // 3. If not, fetch the text from the Bible API
      const text = await fetchVerseText(reference);
      if (text) {
        return {
          text,
          reference,
          backgroundImage: getDailyBackground(),
        };
      }
    }

    // 4. Fallback to today's daily_verses if devotional fetching failed or had no text
    const { data, error } = await supabase
      .from('daily_verses')
      .select('text, reference')
      .eq('publish_date', today)
      .maybeSingle();

    if (error) {
      if (__DEV__) {
        console.error('Error fetching daily verse:', error);
      }
      return { ...FALLBACK_VERSE, backgroundImage: getDailyBackground() };
    }

    if (data && typeof data === 'object' && 'text' in data && 'reference' in data) {
      const verse = data as { text: string; reference: string };
      return {
        text: verse.text,
        reference: verse.reference,
        backgroundImage: getDailyBackground(),
      };
    }
  } catch (err) {
    if (__DEV__) {
      console.error('Unexpected error fetching daily verse:', err);
    }
  }

  return { ...FALLBACK_VERSE, backgroundImage: getDailyBackground() };
}
