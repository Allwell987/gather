import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseColors, Typography, Spacing, Radius } from '../../../constants/theme';
import type { PrayerRequestUI } from '../types';

interface PrayerCardProps {
  prayer: PrayerRequestUI;
  theme: any;
  colors: any;
  onTogglePraying: (id: string) => void;
  onMarkAsAnswered: (id: string) => void;
}

export const PrayerCard: React.FC<PrayerCardProps> = ({
  prayer,
  theme,
  colors,
  onTogglePraying,
  onMarkAsAnswered,
}) => {
  return (
    <View style={[styles.prayerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: prayer.avatarColor ?? theme.accent }]}>
          {prayer.isAnonymous ? (
            <Ionicons name="person" size={16} color={BaseColors.white} />
          ) : (
            <Text style={styles.avatarText}>{prayer.initials}</Text>
          )}
        </View>
        <View style={styles.cardMeta}>
          <Text style={[styles.requesterName, { color: colors.text }]}>{prayer.name}</Text>
          <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>{prayer.timeAgo}</Text>
        </View>
        {prayer.status === 'answered' && (
          <View style={[styles.answeredBadge, { backgroundColor: BaseColors.sage }]}>
            <Ionicons name="checkmark-circle" size={12} color={BaseColors.white} />
            <Text style={styles.answeredBadgeText}>Answered</Text>
          </View>
        )}
      </View>

      <View style={[styles.categoryChip, { backgroundColor: theme.accentLight }]}>
        <Text style={[styles.categoryText, { color: theme.accentDeep }]}>{prayer.category}</Text>
      </View>

      <Text style={[styles.prayerText, { color: colors.text }]}>{prayer.text}</Text>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            { backgroundColor: colors.background, borderColor: colors.border },
            prayer.userPraying && { backgroundColor: theme.accentLight, borderColor: theme.accentBorder },
          ]}
          onPress={() => onTogglePraying(prayer.id)}
          accessibilityRole="button"
          accessibilityLabel={`Toggle praying for request from ${prayer.name}`}
        >
          <Text
            style={[
              styles.actionBtnText,
              { color: colors.textSecondary },
              prayer.userPraying && { color: theme.accent },
            ]}
          >
            🙏 {prayer.prayingCount} praying
          </Text>
        </TouchableOpacity>

        {prayer.isMyRequest && prayer.status === 'open' && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: theme.accentBorder }]}
            onPress={() => onMarkAsAnswered(prayer.id)}
          >
            <Text style={[styles.actionBtnText, { color: theme.accent }]}>Mark as Answered 🙌</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  prayerCard: { borderRadius: Radius.lg, padding: Spacing.xl, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Typography.sansSemiBold, fontSize: 13, color: BaseColors.white },
  cardMeta: { flex: 1 },
  requesterName: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm },
  timeAgo: { fontFamily: Typography.sans, fontSize: Typography.sizes.xs },
  answeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  answeredBadgeText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: 10,
    color: BaseColors.white,
    textTransform: 'uppercase',
  },
  categoryChip: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  categoryText: { fontFamily: Typography.sansSemiBold, fontSize: 10 },
  prayerText: {
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.base,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  cardActions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  actionBtnText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.xs },
});
