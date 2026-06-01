import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parseISO, format, subHours, isBefore } from 'date-fns';
import * as Notifications from 'expo-notifications';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { scheduleNotification } from '../services/notifications';
import {
  enqueueOfflineAction,
  getQueuedOfflineActions,
  shouldQueueOfflineAction,
  type ToggleRsvpOfflineAction,
} from '../services/offlineActionQueue';
import { t } from '../services/locale';
import type { Database, EventCategory } from '../types/database';

const CATEGORY_MAP: Record<
  EventCategory,
  { emoji: string; stripeColor: string; tagBg: string; tagColor: string }
> = {
  worship: { emoji: '⛪', stripeColor: '#1a56db', tagBg: '#e8f0fe', tagColor: '#1a56db' },
  prayer: { emoji: '🙏', stripeColor: '#52775a', tagBg: '#eef4f0', tagColor: '#52775a' },
  bible_study: { emoji: '📖', stripeColor: '#52775a', tagBg: '#eef4f0', tagColor: '#52775a' },
  fellowship: { emoji: '👥', stripeColor: '#7c3aed', tagBg: '#ede9fe', tagColor: '#7c3aed' },
  service: { emoji: '🌍', stripeColor: '#c9922a', tagBg: '#fdefd0', tagColor: '#a87520' },
};

const applyPendingRsvpToEvent = async <T extends {
  id: string;
  rsvpd: boolean;
  attendeesCount: number;
}>(event: T, userId?: string) => {
  if (!userId) return { ...event, syncStatus: undefined };

  const queuedActions = await getQueuedOfflineActions();
  const pendingAction = queuedActions
    .filter((action): action is ToggleRsvpOfflineAction => action.type === 'toggle_rsvp')
    .filter((action) => action.payload.userId === userId && action.payload.eventId === event.id)
    .at(-1);

  if (!pendingAction) return { ...event, syncStatus: undefined };

  const shouldRsvp = pendingAction.payload.shouldRsvp;
  const attendeeDelta = shouldRsvp === event.rsvpd ? 0 : shouldRsvp ? 1 : -1;

  return {
    ...event,
    rsvpd: shouldRsvp,
    attendeesCount: Math.max(0, event.attendeesCount + attendeeDelta),
    syncStatus: 'pending' as const,
  };
};

export const useEventDetail = (eventId: string) => {
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();
  const [reminderScheduled, setReminderScheduled] = useState(false);

  const { data: event, isLoading, isError } = useQuery({
    queryKey: ['event-detail', eventId, user?.id],
    enabled: Boolean(eventId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, event_rsvps(user_id)')
        .eq('id', eventId)
        .returns<(Database['public']['Tables']['events']['Row'] & { event_rsvps: { user_id: string }[] })[]>()
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const start = parseISO(data.start_time);
      const end = parseISO(data.end_time);
      const categoryInfo = CATEGORY_MAP[data.category as EventCategory] ?? {
        emoji: '📅', stripeColor: '#6b7280', tagBg: '#f3f4f6', tagColor: '#374151',
      };
      const attendees = data.event_rsvps ?? [];

      return applyPendingRsvpToEvent({
        ...data,
        emoji: categoryInfo.emoji,
        stripeColor: categoryInfo.stripeColor,
        tagBg: categoryInfo.tagBg,
        tagColor: categoryInfo.tagColor,
        dateLabel: format(start, 'EEEE, MMMM d, yyyy'),
        timeLabel: `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`,
        attendeesCount: attendees.length,
        rsvpd: Boolean(user?.id && attendees.some((entry: any) => entry.user_id === user.id)),
        capacity: data.capacity ?? 300,
        syncStatus: undefined as 'pending' | undefined,
      }, user?.id);
    },
  });

  const toggleRSVPMutation = useMutation({
    mutationFn: async () => {
      if (!event) throw new Error('Event not found.');
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
          .upsert({ event_id: event.id, user_id: user.id } as never, { onConflict: 'event_id,user_id' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-detail', eventId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['events', user?.id] });
    },
    onError: (error: Error) => {
      void (async () => {
        if (!event || !user?.id) {
          showToast({ title: 'RSVP failed', message: error.message, variant: 'error' });
          return;
        }

        if (await shouldQueueOfflineAction(error)) {
          const shouldRsvp = !event.rsvpd;
          await enqueueOfflineAction({
            type: 'toggle_rsvp',
            payload: { userId: user.id, eventId: event.id, shouldRsvp },
          });

          queryClient.setQueryData(['event-detail', eventId, user?.id], (old: any) => {
            if (!old) return old;
            return {
              ...old,
              rsvpd: shouldRsvp,
              attendeesCount: Math.max(0, old.attendeesCount + (shouldRsvp ? 1 : -1)),
              syncStatus: 'pending',
            };
          });

          showToast({ title: t('savedOfflineTitle'), message: t('savedOfflineRsvp'), variant: 'warning' });
          return;
        }

        showToast({ title: 'RSVP failed', message: error.message, variant: 'error' });
      })();
    },
  });

  const handleScheduleReminder = async () => {
    if (!event) return;
    const reminderTime = subHours(parseISO(event.start_time), 1);
    if (isBefore(reminderTime, new Date())) {
      Alert.alert('Too late to schedule', 'This event is already too close to schedule a one-hour reminder.');
      return;
    }

    const result = await scheduleNotification('Upcoming Event', `${event.title} starts in 1 hour`, {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderTime
    }, { type: 'event', eventId: event.id });
    if (result) {
      setReminderScheduled(true);
      showToast({ title: 'Reminder set', message: 'You will get a reminder one hour before the event starts.', variant: 'success' });
    }
  };

  return {
    event,
    isLoading,
    isError,
    reminderScheduled,
    toggleRSVPMutation,
    handleScheduleReminder,
  };
};
