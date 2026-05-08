import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { fetchYoutubeLive, getYoutubeWatchUrl } from '../services/youtube';

export function useLiveStatus() {
  const { data: liveEvent } = useQuery({
    queryKey: ['live-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_live', true)
        .order('start_time', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 1000 * 60 * 5,
  });

  const { data: youtubeLive } = useQuery({
    queryKey: ['youtube-live'],
    queryFn: fetchYoutubeLive,
    refetchInterval: 1000 * 60 * 15,
    retry: false,
  });

  const activeLive = liveEvent ?? (youtubeLive
    ? {
        title: youtubeLive.title,
        live_url: getYoutubeWatchUrl(youtubeLive.id),
      }
    : null);

  return {
    isLive: Boolean(activeLive),
    activeLive,
  };
}
