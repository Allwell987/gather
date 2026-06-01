import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Radius, Spacing } from '../../../constants/theme';

interface ServiceTimesCardProps {
  theme: any;
  colors: any;
}

const SERVICE_SCHEDULE = [
  { day: 'Sunday', time: '8:00 AM', name: 'Special Service' },
  { day: 'Monday', time: '5:00 PM', name: 'G5 Meeting' },
  { day: 'Wednesday', time: '5:00 PM', name: 'Bible Study' },
  { day: 'Friday', time: '9:00 AM', name: "The Lord's Day (P.H.D)" },
];

export const ServiceTimesCard: React.FC<ServiceTimesCardProps> = ({ theme, colors }) => {
  return (
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
  );
};

const styles = StyleSheet.create({
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
});
