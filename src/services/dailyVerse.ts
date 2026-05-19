// src/services/dailyVerse.ts
import { supabase } from './supabase';
import { DAILY_VERSE as FALLBACK_VERSE } from '../constants/theme';

export interface DailyVerse {
  text: string;
  reference: string;
}

/**
 * Fetches the verse of the day for the current date.
 * Falls back to the hardcoded DAILY_VERSE if none is found for today.
 */
export async function fetchDailyVerse(): Promise<DailyVerse> {
  const today = new Date().toISOString().split('T')[0];

  try {
    const { data, error } = await supabase
      .from('daily_verses')
      .select('text, reference')
      .eq('publish_date', today)
      .maybeSingle();

    if (error) {
      console.error('Error fetching daily verse:', error);
      return FALLBACK_VERSE;
    }

    if (data) {
      return data as DailyVerse;
    }
  } catch (err) {
    console.error('Unexpected error fetching daily verse:', err);
  }

  return FALLBACK_VERSE;
}
