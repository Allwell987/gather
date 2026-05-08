import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../services/supabase';
import { readOfflineCache, writeOfflineCache } from '../../../services/offlineCache';
import { differenceInDays } from 'date-fns';

const SERVICE_TIMES = [
  { day: 'Sunday', service: 'Special Service', time: '8:00 AM', dayNum: 0, hour: 8 },
  { day: 'Wednesday', service: 'Bible Study', time: '5:00 PM', dayNum: 3, hour: 17 },
  { day: 'Friday', service: 'The Lord\'s Day (P.H.D)', time: '9:00 AM', dayNum: 5, hour: 9 },
];

export function useHome(user: any) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning,';
    if (hour >= 12 && hour < 17) return 'Good afternoon,';
    if (hour >= 17 && hour < 22) return 'Good evening,';
    return 'Good night,';
  };

  const getNextService = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.getHours() + now.getMinutes() / 60;
    const sorted = [...SERVICE_TIMES].sort((a, b) => a.dayNum !== b.dayNum ? a.dayNum - b.dayNum : a.hour - b.hour);
    let next = sorted.find(s => s.dayNum === currentDay && s.hour > currentTime) || sorted.find(s => s.dayNum > currentDay) || sorted[0];
    return next;
  };

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await supabase.from('events').select('*').gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(3);
      if (data) {
        setEvents(data);
        await writeOfflineCache('home-events', data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const getStreakData = () => {
    const count = user?.streak_count ?? 0;
    const last = user?.streak_last_date ? new Date(user.streak_last_date) : null;
    if (!last) return { count: 0, status: 'Start your journey!' };
    const diff = differenceInDays(new Date(), last);
    if (diff === 0) return { count, status: 'Keep it up!' };
    if (diff === 1) return { count, status: 'Read today to maintain!' };
    return { count: 0, status: 'Start a new streak!' };
  };

  return {
    greeting: getGreeting(),
    nextService: getNextService(),
    events,
    isLoading: loading,
    streak: getStreakData(),
    refetch: fetchEvents,
  };
}
