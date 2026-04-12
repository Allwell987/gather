// src/screens/events/EventDetailScreen.tsx
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parseISO, format, subHours, isBefore } from 'date-fns';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { scheduleNotification } from '../../services/notifications';
import {
  enqueueOfflineAction,
  getQueuedOfflineActions,
  shouldQueueOfflineAction,
  type ToggleRsvpOfflineAction,
} from '../../services/offlineActionQueue';
import { supabase } from '../../services/supabase';
import { BaseColors, Typography, Spacing, Radius, CHURCH } from '../../constants/theme';
import type { Database, EventCategory } from '../../types/database';
import type { EventsStackNavigationProp, EventDetailRouteProp } from '../../types/navigation';

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
  if (!userId) {
    return {
      ...event,
      syncStatus: undefined,
    };
  }

  const queuedActions = await getQueuedOfflineActions();
  const pendingAction = queuedActions
    .filter((action): action is ToggleRsvpOfflineAction => action.type === 'toggle_rsvp')
    .filter((action) => action.payload.userId === userId && action.payload.eventId === event.id)
    .at(-1);

  if (!pendingAction) {
    return {
      ...event,
      syncStatus: undefined,
    };
  }

  const shouldRsvp = pendingAction.payload.shouldRsvp;
  const attendeeDelta = shouldRsvp === event.rsvpd
    ? 0
    : shouldRsvp
      ? 1
      : -1;

  return {
    ...event,
    rsvpd: shouldRsvp,
    attendeesCount: Math.max(0, event.attendeesCount + attendeeDelta),
    syncStatus: 'pending' as const,
  };
};

export default function EventDetailScreen() {
  const navigation = useNavigation<EventsStackNavigationProp>();
  const route = useRoute<EventDetailRouteProp>();
  const { theme } = useThemeStore();
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();
  const eventId = route.params?.eventId;
  const [reminderScheduled, setReminderScheduled] = useState(false);

  const { data: event, isLoading, isError } = useQuery({
    queryKey: ['event-detail', eventId, user?.id],
    enabled: Boolean(eventId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          event_rsvps(user_id)
        `)
        .eq('id', eventId)
        .maybeSingle()
        .returns<Database['public']['Tables']['events']['Row'] & {
          event_rsvps: { user_id: string }[];
        }>();

      if (error) throw error;
      if (!data) return null;

      const start = parseISO((data as any).start_time);
      const end = parseISO((data as any).end_time);
      const categoryInfo =
        CATEGORY_MAP[(data as any).category] ?? {
          emoji: '📅',
          stripeColor: '#6b7280',
          tagBg: '#f3f4f6',
          tagColor: '#374151',
        };
      const attendees = (data as any).event_rsvps ?? [];

      return applyPendingRsvpToEvent({
        ...(data as any),
        emoji: categoryInfo.emoji,
        stripeColor: categoryInfo.stripeColor,
        tagBg: categoryInfo.tagBg,
        tagColor: categoryInfo.tagColor,
        dateLabel: format(start, 'EEEE, MMMM d, yyyy'),
        timeLabel: `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`,
        attendeesCount: attendees.length,
        rsvpd: Boolean(user?.id && attendees.some((entry: any) => entry.user_id === user.id)),
        capacity: (data as any).capacity ?? 300,
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
        return;
      }

      const { error } = await supabase
        .from('event_rsvps')
        .upsert(
          {
            event_id: event.id,
            user_id: user.id,
          } as never,
          { onConflict: 'event_id,user_id' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-detail', eventId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['events', user?.id] });
    },
    onError: (error: Error) => {
      void (async () => {
        if (!event || !user?.id) {
          showToast({
            title: 'RSVP failed',
            message: error.message,
            variant: 'error',
          });
          return;
        }

        if (await shouldQueueOfflineAction(error)) {
          const shouldRsvp = !event.rsvpd;
          await enqueueOfflineAction({
            type: 'toggle_rsvp',
            payload: {
              userId: user.id,
              eventId: event.id,
              shouldRsvp,
            },
          });

          queryClient.setQueryData(['event-detail', eventId, user?.id], (currentEvent: any) => {
            if (!currentEvent) {
              return currentEvent;
            }

            return {
              ...currentEvent,
              rsvpd: shouldRsvp,
              attendeesCount: Math.max(
                0,
                (currentEvent.attendeesCount ?? 0) + (shouldRsvp === currentEvent.rsvpd ? 0 : shouldRsvp ? 1 : -1)
              ),
              syncStatus: 'pending',
            };
          });

          queryClient.setQueryData(['events', user?.id], (currentEvents: any) => {
            if (!Array.isArray(currentEvents)) {
              return currentEvents;
            }

            return currentEvents.map((currentEvent) => {
              if (currentEvent.id !== event.id) {
                return currentEvent;
              }

              return {
                ...currentEvent,
                rsvpd: shouldRsvp,
                attendees: Math.max(
                  0,
                  currentEvent.attendees + (shouldRsvp === currentEvent.rsvpd ? 0 : shouldRsvp ? 1 : -1)
                ),
                syncStatus: 'pending',
              };
            });
          });

          showToast({
            title: 'Saved offline',
            message: 'Your RSVP will sync automatically when you are back online.',
            variant: 'warning',
          });
          return;
        }

        showToast({
          title: 'RSVP failed',
          message: error.message,
          variant: 'error',
        });
      })();
    },
  });

  const scheduleReminder = async () => {
    if (!event) {
      return;
    }

    const reminderTime = subHours(parseISO(event.start_time), 1);

    if (isBefore(reminderTime, new Date())) {
      Alert.alert('Too late to schedule', 'This event is already too close to schedule a one-hour reminder.');
      return;
    }

    const result = await scheduleNotification(
      'Upcoming Event',
      `${event.title} starts in 1 hour`,
      { type: SchedulableTriggerInputTypes.DATE, date: reminderTime },
      {
        type: 'event',
        eventId: event.id,
      }
    );

    if (result) {
      setReminderScheduled(true);
      showToast({
        title: 'Reminder set',
        message: 'You will get a reminder one hour before the event starts.',
        variant: 'success',
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator size="small" color={theme.accent} />
        <Text style={styles.stateText}>Loading event details…</Text>
      </View>
    );
  }

  if (isError || !event) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateTitle}>Event unavailable</Text>
        <Text style={styles.stateText}>
          This screen now expects real event data. Re-run the updated schema and RSVP tables if this keeps happening.
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.calendarBtn, styles.stateButton]}>
          <Text style={styles.calendarBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const attendanceWidth = `${Math.min((event.attendeesCount / Math.max(event.capacity, 1)) * 100, 100)}%`;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: BaseColors.brown900 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={BaseColors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event Details</Text>
          <TouchableOpacity style={styles.shareBtn}>
            <Ionicons name="share-social-outline" size={20} color={BaseColors.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
        <View style={[styles.banner, { backgroundColor: event.stripeColor + '22' }]}>
          <Text style={styles.bannerEmoji}>{event.emoji}</Text>
          <View style={[styles.categoryPill, { backgroundColor: event.tagBg }]}>
            <Text style={[styles.categoryPillText, { color: event.tagColor }]}>
              {event.category}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.eventName}>{event.title}</Text>

          <View style={styles.metaCards}>
            <View style={styles.metaCard}>
              <View style={[styles.metaIcon, { backgroundColor: theme.accentLight }]}>
                <Ionicons name="calendar" size={18} color={theme.accent} />
              </View>
              <View>
                <Text style={styles.metaLabel}>Date & Time</Text>
                <Text style={styles.metaValue}>{event.dateLabel}</Text>
                <Text style={styles.metaValue}>{event.timeLabel}</Text>
              </View>
            </View>

            <View style={styles.metaCard}>
              <View style={[styles.metaIcon, { backgroundColor: theme.accentLight }]}>
                <Ionicons name="location" size={18} color={theme.accent} />
              </View>
              <View>
                <Text style={styles.metaLabel}>Location</Text>
                <Text style={styles.metaValue}>{event.location || CHURCH.fullLocation}</Text>
              </View>
            </View>

            <View style={styles.metaCard}>
              <View style={[styles.metaIcon, { backgroundColor: BaseColors.sageLight }]}>
                <Ionicons name="person" size={18} color={BaseColors.sage} />
              </View>
              <View>
                <Text style={styles.metaLabel}>Hosted by</Text>
                <Text style={styles.metaValue}>{CHURCH.name}</Text>
              </View>
            </View>
          </View>

          <View style={styles.attendeesSection}>
            <Text style={styles.sectionLabel}>Attending ({event.attendeesCount})</Text>
            <View style={styles.avatarRow}>
              {['#1a56db', '#8a6840', '#a87520', '#4a6fa5', '#52775a'].map((color, index) => (
                <View
                  key={index}
                  style={[
                    styles.attendeeAv,
                    { backgroundColor: color, marginLeft: index > 0 ? -10 : 0, zIndex: 5 - index },
                  ]}
                />
              ))}
              {event.attendeesCount > 5 ? (
                <View style={[styles.attendeeAv, styles.attendeeOverflow, { marginLeft: -10 }]}>
                  <Text style={styles.attendeeOverflowText}>+{event.attendeesCount - 5}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.capacitySection}>
            <View style={styles.capacityHeader}>
              <Text style={styles.sectionLabel}>Capacity</Text>
              <Text style={styles.capacityText}>
                {event.attendeesCount} / {event.capacity}
              </Text>
            </View>
            <View style={styles.capacityBar}>
              <View
                style={[
                  styles.capacityFill,
                  { width: attendanceWidth as any, backgroundColor: theme.accent },
                ]}
              />
            </View>
          </View>

          <View style={styles.descSection}>
            <Text style={styles.sectionLabel}>About this event</Text>
            <Text style={styles.descText}>
              {event.description || 'More details for this event will be shared by the church team soon.'}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.calendarBtn,
              reminderScheduled && { backgroundColor: theme.accentLight, borderColor: theme.accentBorder },
            ]}
            onPress={scheduleReminder}
          >
            <Ionicons
              name={reminderScheduled ? 'notifications' : 'calendar-outline'}
              size={18}
              color={reminderScheduled ? theme.accent : BaseColors.brown700}
            />
            <Text
              style={[
                styles.calendarBtnText,
                reminderScheduled && { color: theme.accentDeep },
              ]}
            >
              {reminderScheduled ? 'Reminder scheduled' : 'Remind me 1 hour before'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.stickyFooter}>
        <TouchableOpacity
          style={[
            styles.rsvpBtn,
            { backgroundColor: event.rsvpd ? theme.accent : BaseColors.gold },
          ]}
          onPress={() => toggleRSVPMutation.mutate()}
          activeOpacity={0.85}
        >
          <Ionicons
            name={event.rsvpd ? 'checkmark-circle' : 'add-circle-outline'}
            size={20}
            color={BaseColors.white}
          />
          <Text style={styles.rsvpBtnText}>
            {event.syncStatus === 'pending'
              ? 'Syncing RSVP…'
              : event.rsvpd
                ? "You're going ✓"
                : "RSVP — I'm coming"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BaseColors.cream },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    backgroundColor: BaseColors.cream,
  },
  stateTitle: { fontFamily: Typography.serif, fontSize: Typography.sizes['2xl'], color: BaseColors.brown900 },
  stateText: { fontFamily: Typography.sans, fontSize: Typography.sizes.sm, color: BaseColors.brown400, textAlign: 'center', lineHeight: 20 },
  stateButton: { marginTop: Spacing.md, minWidth: 140 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: Typography.serif, fontSize: Typography.sizes.xl, color: BaseColors.white },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: { height: 160, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  bannerEmoji: { fontSize: 64 },
  categoryPill: { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 5 },
  categoryPillText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm },
  content: { padding: Spacing.xl },
  eventName: {
    fontFamily: Typography.serif,
    fontSize: Typography.sizes['3xl'],
    color: BaseColors.brown900,
    marginBottom: Spacing.xl,
    lineHeight: 36,
  },
  metaCards: { gap: Spacing.md, marginBottom: Spacing.xl },
  metaCard: {
    backgroundColor: BaseColors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: BaseColors.brown100,
  },
  metaIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  metaLabel: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.xs,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: BaseColors.brown400,
    marginBottom: 3,
  },
  metaValue: { fontFamily: Typography.sansMedium, fontSize: Typography.sizes.sm, color: BaseColors.brown900, lineHeight: 20 },
  attendeesSection: { marginBottom: Spacing.xl },
  sectionLabel: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm, color: BaseColors.brown900, marginBottom: Spacing.sm },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  attendeeAv: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: BaseColors.cream,
  },
  attendeeOverflow: { backgroundColor: BaseColors.brown200, alignItems: 'center', justifyContent: 'center' },
  attendeeOverflowText: { fontFamily: Typography.sansSemiBold, fontSize: 11, color: BaseColors.brown700 },
  capacitySection: { marginBottom: Spacing.xl },
  capacityHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  capacityText: { fontFamily: Typography.sansMedium, fontSize: Typography.sizes.sm, color: BaseColors.brown400 },
  capacityBar: { height: 6, backgroundColor: BaseColors.brown100, borderRadius: 3 },
  capacityFill: { height: '100%', borderRadius: 3 },
  descSection: { marginBottom: Spacing.xl },
  descText: { fontFamily: Typography.sans, fontSize: Typography.sizes.base, color: BaseColors.brown700, lineHeight: 24 },
  calendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: BaseColors.brown100,
    borderRadius: Radius.md,
    paddingVertical: 12,
  },
  calendarBtnText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.base, color: BaseColors.brown700 },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: BaseColors.white,
    padding: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    borderTopWidth: 1,
    borderTopColor: BaseColors.brown100,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  rsvpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    paddingVertical: 15,
  },
  rsvpBtnText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.md, color: BaseColors.white },
});
