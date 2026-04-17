// src/screens/events/EventsScreen.tsx
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { BaseColors, Typography, Spacing, Radius, CHURCH } from '../../constants/theme';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  formatOfflineTimestamp,
  readOfflineCache,
  writeOfflineCache,
} from '../../services/offlineCache';
import {
  enqueueOfflineAction,
  getQueuedOfflineActions,
  shouldQueueOfflineAction,
  type ToggleRsvpOfflineAction,
} from '../../services/offlineActionQueue';
import { supabase } from '../../services/supabase';
import type { EventsScreenNavigationProp } from '../../types/navigation';
import {
  addDays,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';

interface ChurchEvent {
  id: string;
  title: string;
  description: string;
  cover_url?: string;
  category: string;
  start_time: string;
  end_time: string;
  location: string;
  is_live: boolean;
  live_url?: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  capacity?: number | null;
  emoji: string;
  date: string;
  time: string;
  endTime: string;
  attendees: number;
  stripeColor: string;
  tagBg: string;
  tagColor: string;
  rsvpd: boolean;
  syncStatus?: 'pending';
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SERVICE_SCHEDULE = [
  { day: 'Sunday', time: '8:00 AM', name: 'Special Service' },
  { day: 'Monday', time: '5:00 PM', name: 'G5 Meeting' },
  { day: 'Wednesday', time: '5:00 PM', name: 'Bible Study' },
  { day: 'Friday', time: '9:00 AM', name: "The Lord's Day (P.H.D)" },
];

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
  const rsvps = event.event_rsvps ?? [];

  return {
    ...event,
    emoji: categoryInfo.emoji,
    date: format(start, 'EEE, MMM d'),
    time: format(start, 'h:mm a'),
    endTime: format(end, 'h:mm a'),
    attendees: rsvps.length,
    stripeColor: categoryInfo.stripeColor,
    tagBg: categoryInfo.tagBg,
    tagColor: categoryInfo.tagColor,
    rsvpd: Boolean(userId && rsvps.some((rsvp: { user_id: string }) => rsvp.user_id === userId)),
  };
};

const applyPendingRsvpActions = async (
  events: ChurchEvent[],
  userId?: string
): Promise<ChurchEvent[]> => {
  if (!userId) {
    return events;
  }

  const queuedActions = await getQueuedOfflineActions();
  const pendingRsvps = new Map<string, boolean>();

  queuedActions
    .filter((action): action is ToggleRsvpOfflineAction => action.type === 'toggle_rsvp')
    .filter((action) => action.payload.userId === userId)
    .forEach((action) => {
      pendingRsvps.set(action.payload.eventId, action.payload.shouldRsvp);
    });

  return events.map((event) => {
    const shouldRsvp = pendingRsvps.get(event.id);

    if (typeof shouldRsvp !== 'boolean') {
      return {
        ...event,
        syncStatus: undefined,
      };
    }

    const attendeeDelta = shouldRsvp === event.rsvpd
      ? 0
      : shouldRsvp
        ? 1
        : -1;

    return {
      ...event,
      rsvpd: shouldRsvp,
      attendees: Math.max(0, event.attendees + attendeeDelta),
      syncStatus: 'pending',
    };
  });
};

export default function EventsScreen() {
  const navigation = useNavigation<EventsScreenNavigationProp>();
  const { theme, colors } = useThemeStore();
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();

  const today = startOfDay(new Date());
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const [showingCachedData, setShowingCachedData] = useState(false);
  const [offlineTimestamp, setOfflineTimestamp] = useState<string | null>(null);

  const headerFade = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerFade, contentFade]);

  const eventsQueryKey = ['events', user?.id] as const;
  const eventsCacheKey = `events:${user?.id ?? 'guest'}`;

  useEffect(() => {
    let isActive = true;

    const restoreCachedEvents = async () => {
      const cached = await readOfflineCache<ChurchEvent[]>(eventsCacheKey);

      if (!cached || !isActive) {
        return;
      }

      queryClient.setQueryData(['events', user?.id], cached.data);
      setShowingCachedData(true);
      setOfflineTimestamp(cached.updatedAt);
    };

    void restoreCachedEvents();

    return () => {
      isActive = false;
    };
  }, [eventsCacheKey, queryClient, user?.id]);

  const { data: events = [], isLoading, isError } = useQuery({
    queryKey: eventsQueryKey,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            event_rsvps(user_id)
          `)
          .order('start_time', { ascending: true });

        if (error) throw error;

        const mapped = (data ?? []).map((event: any): ChurchEvent => mapEventRecord(event, user?.id));
        const merged = await applyPendingRsvpActions(mapped, user?.id);
        await writeOfflineCache(eventsCacheKey, merged);
        setShowingCachedData(false);
        setOfflineTimestamp(null);
        return merged;
      } catch (error) {
        const cached = await readOfflineCache<ChurchEvent[]>(eventsCacheKey);

        if (cached) {
          setShowingCachedData(true);
          setOfflineTimestamp(cached.updatedAt);
          return applyPendingRsvpActions(cached.data, user?.id);
        }

        throw error;
      }
    },
  });

  const toggleRSVPMutation = useMutation({
    mutationFn: async (event: ChurchEvent) => {
      if (!user?.id) {
        throw new Error('Please sign in to RSVP.');
      }

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
      queryClient.invalidateQueries({ queryKey: ['events', user?.id] });
    },
    onError: async (error: Error, event) => {
      if (!user?.id) {
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

        const currentEvents = queryClient.getQueryData<ChurchEvent[]>(eventsQueryKey) ?? [];
        const updatedEvents = currentEvents.map((currentEvent) => {
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
            syncStatus: 'pending' as const,
          };
        });

        queryClient.setQueryData(eventsQueryKey, updatedEvents);
        void writeOfflineCache(eventsCacheKey, updatedEvents);
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
    },
  });

  const calendarDays = useMemo(() => {
    const calendarStart = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 0 });
    return Array.from({ length: 35 }, (_, index) => addDays(calendarStart, index));
  }, [calendarMonth]);

  const filtered = useMemo(() => {
    return events.filter((event) => isSameDay(parseISO(event.start_time), selectedDate));
  }, [events, selectedDate]);

  const nextUpcomingEvent = events.find((event) => parseISO(event.start_time) >= today);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: BaseColors.brown900 }}>
        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <View>
            <Text style={styles.headerTitle}>Events</Text>
            <Text style={styles.headerSub}>{CHURCH.name}</Text>
          </View>
        </Animated.View>
      </SafeAreaView>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        style={{ opacity: contentFade }}
      >
        <View style={[styles.calendarSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.calHeader}>
            <Text style={[styles.calMonth, { color: colors.text }]}>{format(calendarMonth, 'MMMM yyyy')}</Text>
            <View style={styles.calNavBtns}>
              <TouchableOpacity
                style={[styles.calNavBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => setCalendarMonth((current) => subMonths(current, 1))}
              >
                <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.calNavBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => setCalendarMonth((current) => addMonths(current, 1))}
              >
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.weekdays}>
            {DAYS_OF_WEEK.map((day) => (
              <Text key={day} style={[styles.weekday, { color: theme.accent }]}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {calendarDays.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, today);
              const belongsToMonth = isSameMonth(day, calendarMonth);
              const hasEvents = events.some((event) => isSameDay(parseISO(event.start_time), day));

              return (
                <TouchableOpacity
                  key={day.toISOString()}
                  style={[
                    styles.dayCell,
                    !belongsToMonth && styles.dayCellMuted,
                    isToday && !isSelected && { backgroundColor: theme.accentLight },
                    isSelected && { backgroundColor: theme.accent },
                  ]}
                  onPress={() => setSelectedDate(startOfDay(day))}
                >
                  <Text
                    style={[
                      styles.dayNum,
                      !belongsToMonth && [styles.dayNumMuted, { color: colors.textMuted }],
                      isToday && !isSelected && {
                        color: theme.accentDeep,
                        fontFamily: Typography.sansSemiBold,
                      },
                      isSelected && {
                        color: BaseColors.white,
                        fontFamily: Typography.sansSemiBold,
                      },
                      !isSelected && !isToday && { color: colors.text }
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                  {hasEvents ? (
                    <View
                      style={[
                        styles.dayDot,
                        { backgroundColor: isSelected ? BaseColors.white : theme.accent },
                      ]}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {nextUpcomingEvent ? (
          <View style={[styles.reminderBand, { backgroundColor: BaseColors.brown900 }]}>
            <View style={[styles.reminderIcon, { backgroundColor: theme.accent }]}>
              <Ionicons name="notifications" size={18} color={BaseColors.white} />
            </View>
            <View style={styles.reminderInfo}>
              <Text style={styles.reminderTitle}>{nextUpcomingEvent.title}</Text>
              <Text style={styles.reminderSub}>
                {nextUpcomingEvent.date} · {nextUpcomingEvent.time}
              </Text>
            </View>
            <Text style={[styles.reminderCountdown, { color: theme.accentBorder }]}>
              Next
            </Text>
          </View>
        ) : null}

        <View style={[styles.serviceTimesCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <View style={styles.serviceTimesHeader}>
            <View style={[styles.serviceTimesIcon, { backgroundColor: theme.accentLight }]}> 
              <Ionicons name="time-outline" size={18} color={theme.accent} />
            </View>
            <View style={styles.serviceTimesHeaderCopy}>
              <Text style={[styles.serviceTimesTitle, { color: colors.text }]}>Service Times</Text>
              <Text style={[styles.serviceTimesSubtitle, { color: colors.textSecondary }]}>Our weekly worship schedule</Text>
            </View>
          </View>

          {SERVICE_SCHEDULE.map((service, index) => (
            <View
              key={service.day}
              style={[
                styles.serviceRow,
                index !== SERVICE_SCHEDULE.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
              ]}
            >
              <View style={styles.serviceCopy}>
                <Text style={[styles.serviceDay, { color: theme.accent }]}>{service.day}</Text>
                <Text style={[styles.serviceName, { color: colors.text }]}>{service.name}</Text>
              </View>
              <Text style={[styles.serviceTime, { color: colors.textSecondary }]}>{service.time}</Text>
            </View>
          ))}

          <Text style={[styles.serviceNote, { color: colors.textMuted }]}>P.H.D means Prophecy, Healing and Deliverance.</Text>
        </View>

        <View style={styles.eventsSection}>
          {showingCachedData && offlineTimestamp ? (
            <View style={[styles.cachedBanner, { borderColor: theme.accentBorder, backgroundColor: theme.accentLight }]}>
              <Ionicons name="cloud-offline-outline" size={14} color={theme.accent} />
              <Text style={[styles.cachedBannerText, { color: theme.accentDeep }]}>
                Showing saved events. {formatOfflineTimestamp(offlineTimestamp)}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {format(selectedDate, 'EEEE, MMM d')}
          </Text>

          {isLoading ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Loading events…</Text>
            </View>
          ) : isError ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Unable to load events</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Run the updated schema so `event_rsvps` exists and event metadata stays in sync.
              </Text>
            </View>
          ) : filtered.length > 0 ? (
            filtered.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                activeOpacity={0.8}
              >
                <View style={[styles.eventStripe, { backgroundColor: event.stripeColor }]} />
                <View style={styles.eventBody}>
                  <View style={[styles.eventTag, { backgroundColor: event.tagBg }]}>
                    <Text style={[styles.eventTagText, { color: event.tagColor }]}>
                      {event.emoji} {event.category}
                    </Text>
                  </View>

                  <Text style={[styles.eventName, { color: colors.text }]}>{event.title}</Text>

                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      {event.date} · {event.time} – {event.endTime}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>{event.location}</Text>
                  </View>

                  <View style={styles.eventFooter}>
                    <View style={styles.attendeeRow}>
                      {['#1a56db', '#8a6840', '#a87520'].map((color, index) => (
                        <View
                          key={index}
                          style={[
                            styles.attendeeAv,
                            { backgroundColor: color, marginLeft: index > 0 ? -8 : 0, borderColor: colors.card },
                          ]}
                        />
                      ))}
                      <Text style={[styles.attendeeCount, { color: colors.textMuted }]}>  {event.attendees} going</Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.rsvpBtn,
                        event.rsvpd
                          ? { backgroundColor: theme.accent }
                          : {
                              backgroundColor: colors.background,
                              borderWidth: 1.5,
                              borderColor: theme.accent,
                            },
                      ]}
                      onPress={() => toggleRSVPMutation.mutate(event)}
                    >
                      <Text
                        style={[
                          styles.rsvpBtnText,
                          event.rsvpd ? { color: BaseColors.white } : { color: theme.accent },
                        ]}
                      >
                        {event.syncStatus === 'pending'
                          ? 'Syncing…'
                          : event.rsvpd
                            ? '✓ Going'
                            : 'RSVP'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.emptyEmoji}>🗓</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No events found</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                {`No events on ${format(selectedDate, 'MMM d')}.`}
              </Text>
            </View>
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  headerTitle: { fontFamily: Typography.serif, fontSize: Typography.sizes.xl, color: BaseColors.white },
  headerSub: { fontFamily: Typography.sans, fontSize: Typography.sizes.xs, color: BaseColors.brown300 },
  calendarSection: {
    margin: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  calMonth: { fontFamily: Typography.serif, fontSize: Typography.sizes.xl },
  calNavBtns: { flexDirection: 'row', gap: Spacing.sm },
  calNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdays: { flexDirection: 'row', marginBottom: Spacing.sm },
  weekday: { flex: 1, textAlign: 'center', fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.xs },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.sm },
  dayCell: {
    width: '14.28%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.md,
    minHeight: 46,
  },
  dayCellMuted: { opacity: 0.45 },
  dayNum: { fontFamily: Typography.sans, fontSize: Typography.sizes.sm },
  dayNumMuted: { },
  dayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 4 },
  reminderBand: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  reminderIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  reminderInfo: { flex: 1 },
  reminderTitle: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.base, color: BaseColors.white },
  reminderSub: { fontFamily: Typography.sans, fontSize: Typography.sizes.sm, color: BaseColors.brown300, marginTop: 2 },
  reminderCountdown: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm },
  serviceTimesCard: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  serviceTimesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  serviceTimesIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTimesHeaderCopy: { flex: 1 },
  serviceTimesTitle: { fontFamily: Typography.serif, fontSize: Typography.sizes.lg },
  serviceTimesSubtitle: { fontFamily: Typography.sans, fontSize: Typography.sizes.sm, marginTop: 2 },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  serviceCopy: { flex: 1 },
  serviceDay: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm, marginBottom: 3 },
  serviceName: { fontFamily: Typography.sansMedium, fontSize: Typography.sizes.base },
  serviceTime: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm },
  serviceNote: { fontFamily: Typography.sans, fontSize: Typography.sizes.xs, marginTop: Spacing.sm },
  eventsSection: { paddingHorizontal: Spacing.xl },
  cachedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginBottom: Spacing.md,
  },
  cachedBannerText: {
    flex: 1,
    fontFamily: Typography.sansMedium,
    fontSize: Typography.sizes.sm,
  },
  sectionTitle: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.md, marginBottom: Spacing.md },
  eventCard: {
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    flexDirection: 'row',
  },
  eventStripe: { width: 6 },
  eventBody: { flex: 1, padding: Spacing.md },
  eventTag: { alignSelf: 'flex-start', borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 5, marginBottom: Spacing.sm },
  eventTagText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm },
  eventName: { fontFamily: Typography.serif, fontSize: Typography.sizes.lg, marginBottom: Spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  metaText: { fontFamily: Typography.sans, fontSize: Typography.sizes.sm },
  eventFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md },
  attendeeRow: { flexDirection: 'row', alignItems: 'center' },
  attendeeAv: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
  attendeeCount: { fontFamily: Typography.sans, fontSize: Typography.sizes.sm },
  rsvpBtn: { borderRadius: Radius.sm, paddingVertical: 9, paddingHorizontal: Spacing.md, alignItems: 'center' },
  rsvpBtnText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm },
  emptyState: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyEmoji: { fontSize: 28 },
  emptyTitle: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.base, textAlign: 'center' },
  emptySub: { fontFamily: Typography.sans, fontSize: Typography.sizes.sm, textAlign: 'center', lineHeight: 20 },
});
