import { supabase } from './supabase';

export const generatePrayer = async (input: string): Promise<string> => {
  const trimmedInput = input.trim();
  if (!trimmedInput) {
    throw new Error('Input is required.');
  }

  const { data, error } = await supabase.functions.invoke('generate-prayer', {
    body: JSON.stringify({ input: trimmedInput }),
    headers: { 'Content-Type': 'application/json' },
  });

  if (error) {
    throw new Error(error.message || 'AI Service error');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data?.prayer ?? '';
};
