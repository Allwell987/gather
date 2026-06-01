// src/screens/events/EventsScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, isSameDay, parseISO } from 'date-fns';
import HeaderBar from '../../components/common/HeaderBar';
import { useThemeStore } from '../../store/themeStore';
import { BaseColors, Typography, Spacing, Radius } from '../../constants/theme';
import { formatOfflineTimestamp } from '../../services/offlineCache';
import { useCalendar } from '../../hooks/useCalendar';
import { useEvents } from '../../hooks/useEvents';
import { EventCalendar } from './components/EventCalendar';
import { ServiceTimesCard } from './components/ServiceTimesCard';
import { EventListItem } from './components/EventListItem';
import type { EventsScreenNavigationProp } from '../../types/navigation';

export default function EventsScreen({ hideHeader = false }: { hideHeader?: boolean }) {
  const navigation = useNavigation<EventsScreenNavigationProp>();
  const { theme, colors } = useThemeStore();
  const {
    currentMonth,
    selectedDate,
    setSelectedDate,
    days,
    prevMonth,
    nextMonth,
  } = useCalendar();
  const {
    events,
    isLoading,
    isError,
    showingCachedData,
    offlineTimestamp,
    toggleRSVPMutation,
  } = useEvents();

  const [scrollY] = useState(() => new Animated.Value(0));

  const filtered = useMemo(() => {
    return events.filter((e) => isSameDay(parseISO(e.start_time), selectedDate));
  }, [events, selectedDate]);

  const nextUpcomingEvent = useMemo(() => {
    const now = new Date();
    return events.find((e) => new Date(e.start_time) > now);
  }, [events]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!hideHeader && (
        <HeaderBar
          title="Events"
          subtitle="The Wealth Reality Church"
          enableBlur={true}
          showBack={false}
        />
      )}

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        <EventCalendar
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          days={days}
          prevMonth={prevMonth}
          nextMonth={nextMonth}
          events={events}
          theme={theme}
          colors={colors}
        />

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

        <ServiceTimesCard theme={theme} colors={colors} />

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
                Check your connection or try again later.
              </Text>
            </View>
          ) : filtered.length > 0 ? (
            filtered.map((event) => (
              <EventListItem
                key={event.id}
                event={event}
                onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                onRsvp={() => toggleRSVPMutation.mutate(event)}
                theme={theme}
                colors={colors}
              />
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
