// src/services/dailyVerse.ts
import { supabase } from './supabase';
import { DAILY_VERSE as FALLBACK_VERSE } from '../constants/theme';
import { fetchVerseText } from './bibleApi';

export interface DailyVerse {
  text: string;
  reference: string;
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

    if (!devoError && devotional?.anchor_scripture) {
      const reference = devotional.anchor_scripture;

      // 2. Check if we already have the text in daily_verses for this reference
      const { data: existingVerse } = await supabase
        .from('daily_verses')
        .select('text')
        .eq('reference', reference)
        .limit(1)
        .maybeSingle();

      if (existingVerse?.text) {
        return { text: existingVerse.text, reference };
      }

      // 3. If not, fetch the text from the Bible API
      const text = await fetchVerseText(reference);
      if (text) {
        return { text, reference };
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
      return FALLBACK_VERSE;
    }

    if (data) {
      return data as DailyVerse;
    }
  } catch (err) {
    if (__DEV__) {
      console.error('Unexpected error fetching daily verse:', err);
    }
  }

  return FALLBACK_VERSE;
}
