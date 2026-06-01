import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseColors, Typography, Radius, Spacing } from '../../../constants/theme';
import type { ChurchEvent } from '../types';

interface EventListItemProps {
  event: ChurchEvent;
  onPress: () => void;
  onRsvp: () => void;
  theme: any;
  colors: any;
}

export const EventListItem: React.FC<EventListItemProps> = ({
  event,
  onPress,
  onRsvp,
  theme,
  colors,
}) => {
  return (
    <TouchableOpacity
      style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
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
            onPress={onRsvp}
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
  );
};

const styles = StyleSheet.create({
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
});
