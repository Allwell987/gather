import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { BaseColors, Typography, Spacing, Radius } from '../../../constants/theme';
import type { PrayerRequestUI } from '../types';

interface PrayerStatsProps {
  prayers: PrayerRequestUI[];
  theme: any;
  colors: any;
  headerOpacity: Animated.Value;
}

export const PrayerStats: React.FC<PrayerStatsProps> = ({
  prayers,
  theme,
  colors,
  headerOpacity,
}) => {
  return (
    <Animated.View style={[styles.statsRow, { backgroundColor: colors.border, opacity: headerOpacity }]}>
      <View style={[styles.stat, { backgroundColor: theme.accentLight }]}>
        <Text style={[styles.statNum, { color: theme.accentDeep }]}>{prayers.length + 12}</Text>
        <Text style={[styles.statLabel, { color: theme.accent }]}>Prayers today</Text>
      </View>
      <View style={[styles.stat, { backgroundColor: colors.card }]}>
        <Text style={[styles.statNum, { color: colors.text }]}>{prayers.length}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Requests</Text>
      </View>
      <View style={[styles.stat, { backgroundColor: colors.card }]}>
        <Text style={[styles.statNum, { color: colors.text }]}>
          {prayers.filter((p) => p.status === 'answered').length}
        </Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Answered 🙏</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: 1,
    marginHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginTop: Spacing.md,
  },
  stat: { flex: 1, padding: Spacing.md, alignItems: 'center' },
  statNum: { fontFamily: Typography.serif, fontSize: Typography.sizes.xl },
  statLabel: {
    fontFamily: Typography.sans,
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
