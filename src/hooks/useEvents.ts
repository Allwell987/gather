import { useState, useEffect, useMemo, useCallback } from 'react';
import { parseISO, format } from 'date-fns';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import {
  readOfflineCache,
  writeOfflineCache,
} from '../services/offlineCache';
import { t } from '../services/locale';
import {
  enqueueOfflineAction,
  getQueuedOfflineActions,
  shouldQueueOfflineAction,
  type ToggleRsvpOfflineAction,
} from '../services/offlineActionQueue';
import type { ChurchEvent } from '../screens/events/types';

const EVENT_CACHE_KEY = 'church-events';

const CATEGORY_MAP: Record<
  string,
  { emoji: string; stripeColor: string; tagBg: string; tagColor: string }
> = {
  worship: { emoji: '⛪', stripeColor: '#1a56db', tagBg: '#e8f0fe', tagColor: '#1a56db' },
  prayer: { emoji: '🙏', stripeColor: '#52775a', tagBg: '#eef4f0', tagColor: '#52775a' },
  bible_study: { emoji: '📖', stripeColor: '#52775a', tagBg: '#eef4f0', tagColor: '#52775a' },
  fellowship: { emoji: '👥', stripeColor: '#7c3aed', tagBg: '#ede9fe', tagColor: '#7c3aed' },
  service: { emoji: '🌍', stripeColor: '#c9922a', tagBg: '#fdefd0', tagColor: '#a87520' },
};

const mapEventRecord = (event: any, userId?: string): ChurchEvent => {
  const start = parseISO(event.start_time);
  const end = parseISO(event.end_time);
  const categoryInfo =
    CATEGORY_MAP[event.category] ?? {
      emoji: '📅',
      stripeColor: '#6b7280',
      tagBg: '#f3f4f6',
      tagColor: '#374151',
    };
  const attendees = event.event_rsvps ?? [];

  return {
    ...event,
    emoji: categoryInfo.emoji,
    stripeColor: categoryInfo.stripeColor,
    tagBg: categoryInfo.tagBg,
    tagColor: categoryInfo.tagColor,
    date: format(start, 'EEEE, MMM d'),
    time: format(start, 'h:mm a'),
    endTime: format(end, 'h:mm a'),
    attendees: attendees.length,
    rsvpd: Boolean(userId && attendees.some((entry: any) => entry.user_id === userId)),
  };
};

const applyPendingRsvpsToEvents = async (events: ChurchEvent[], userId?: string) => {
  if (!userId) return events;

  const queuedActions = await getQueuedOfflineActions();
  const rsvpActions = queuedActions
    .filter((action): action is ToggleRsvpOfflineAction => action.type === 'toggle_rsvp')
    .filter((action) => action.payload.userId === userId);

  if (rsvpActions.length === 0) return events;

  return events.map((event) => {
    const lastAction = rsvpActions
      .filter((action) => action.payload.eventId === event.id)
      .at(-1);

    if (!lastAction) return event;

    const shouldRsvp = lastAction.payload.shouldRsvp;
    const attendeeDelta = shouldRsvp === event.rsvpd ? 0 : shouldRsvp ? 1 : -1;

    return {
      ...event,
      rsvpd: shouldRsvp,
      attendees: Math.max(0, event.attendees + attendeeDelta),
      syncStatus: 'pending' as const,
    };
  });
};

export const useEvents = () => {
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();

  const [showingCachedData, setShowingCachedData] = useState(false);
  const [offlineTimestamp, setOfflineTimestamp] = useState<string | null>(null);

  const { data: events = [], isLoading, isError } = useQuery({
    queryKey: ['events', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, event_rsvps(user_id)')
        .order('start_time', { ascending: true });

      if (error) throw error;

      const mapped = (data || []).map((e) => mapEventRecord(e, user?.id));
      const finalEvents = await applyPendingRsvpsToEvents(mapped, user?.id);

      await writeOfflineCache(EVENT_CACHE_KEY, finalEvents);
      setShowingCachedData(false);
      setOfflineTimestamp(null);

      return finalEvents;
    },
  });

  useEffect(() => {
    const restoreCachedEvents = async () => {
      if (events.length > 0) return;
      const cached = await readOfflineCache<ChurchEvent[]>(EVENT_CACHE_KEY);
      if (cached) {
        queryClient.setQueryData(['events', user?.id], cached.data);
        setShowingCachedData(true);
        setOfflineTimestamp(cached.updatedAt);
      }
    };
    void restoreCachedEvents();
  }, [events.length, user?.id, queryClient]);

  const toggleRSVPMutation = useMutation({
    mutationFn: async (event: ChurchEvent) => {
      if (!user?.id) throw new Error('Please sign in to RSVP.');

      if (event.rsvpd) {
        const { error } = await supabase
          .from('event_rsvps')
          .delete()
          .eq('event_id', event.id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('event_rsvps')
          .upsert({ event_id: event.id, user_id: user.id } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['event-detail'] });
    },
    onError: (error: Error, event: ChurchEvent) => {
      void (async () => {
        if (!user?.id) {
          showToast({ title: 'RSVP failed', message: error.message, variant: 'error' });
          return;
        }

        if (await shouldQueueOfflineAction(error)) {
          const shouldRsvp = !event.rsvpd;
          await enqueueOfflineAction({
            type: 'toggle_rsvp',
            payload: { userId: user.id, eventId: event.id, shouldRsvp },
          });

          queryClient.setQueryData(['events', user.id], (old: ChurchEvent[] | undefined) => {
            if (!old) return old;
            return old.map((e) => {
              if (e.id !== event.id) return e;
              return {
                ...e,
                rsvpd: shouldRsvp,
                attendees: Math.max(0, e.attendees + (shouldRsvp ? 1 : -1)),
                syncStatus: 'pending',
              };
            });
          });

          showToast({
            title: t('savedOfflineTitle'),
            message: t('savedOfflineRsvp'),
            variant: 'warning',
          });
          return;
        }

        showToast({ title: 'RSVP failed', message: error.message, variant: 'error' });
      })();
    },
  });

  return {
    events,
    isLoading,
    isError,
    showingCachedData,
    offlineTimestamp,
    toggleRSVPMutation,
  };
};
