// src/screens/events/EventDetailScreen.tsx
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import HeaderBar from '../../components/common/HeaderBar';
import { BaseColors, Typography, Spacing, Radius, CHURCH } from '../../constants/theme';
import { useEventDetail } from '../../hooks/useEventDetail';
import { EventMetaCards } from './components/EventMetaCards';
import { EventCapacityBar } from './components/EventCapacityBar';
import type { EventsStackNavigationProp, EventDetailRouteProp } from '../../types/navigation';

export default function EventDetailScreen() {
  const navigation = useNavigation<EventsStackNavigationProp>();
  const route = useRoute<EventDetailRouteProp>();
  const { theme, colors } = useThemeStore();
  const eventId = route.params?.eventId;

  const {
    event,
    isLoading,
    isError,
    reminderScheduled,
    toggleRSVPMutation,
    handleScheduleReminder,
  } = useEventDetail(eventId);

  const handleShare = async () => {
    if (!event) return;
    try {
      await Share.share({
        message: `Join us for ${event.title} at ${CHURCH.name}!\n\n📅 ${event.dateLabel}\n🕒 ${event.timeLabel}\n📍 ${event.location || CHURCH.fullLocation}\n\nDownload the Gather app to RSVP!`,
        title: event.title,
      });
    } catch (error) {
      if (__DEV__) {
        console.error('Sharing error:', error);
      }
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
          Check your connection or try again later.
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.calendarBtn, styles.stateButton]}>
          <Text style={styles.calendarBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar
        title="Event Details"
        onBackPress={() => navigation.goBack()}
        rightIcon="share-social-outline"
        rightAction={handleShare}
        enableBlur={true}
        style={{ borderBottomWidth: 0 }}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }} keyboardDismissMode="on-drag">
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

          <EventMetaCards
            dateLabel={event.dateLabel}
            timeLabel={event.timeLabel}
            location={event.location || CHURCH.fullLocation}
            churchName={CHURCH.name}
            theme={theme}
          />

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

          <EventCapacityBar
            attendeesCount={event.attendeesCount}
            capacity={event.capacity}
            theme={theme}
          />

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
            onPress={handleScheduleReminder}
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
  container: { flex: 1 },
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
