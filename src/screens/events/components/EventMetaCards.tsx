import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseColors, Spacing, Radius } from '../../../constants/theme';

interface EventMetaCardsProps {
  dateLabel: string;
  timeLabel: string;
  location: string;
  churchName: string;
  theme: any;
}

export const EventMetaCards: React.FC<EventMetaCardsProps> = ({
  dateLabel,
  timeLabel,
  location,
  churchName,
  theme,
}) => {
  return (
    <View style={styles.metaCards}>
      <View style={styles.metaCard}>
        <View style={[styles.metaIcon, { backgroundColor: theme.accentLight }]}>
          <Ionicons name="calendar" size={18} color={theme.accent} />
        </View>
        <View>
          <Text style={styles.metaLabel}>Date & Time</Text>
          <Text style={styles.metaValue}>{dateLabel}</Text>
          <Text style={styles.metaValue}>{timeLabel}</Text>
        </View>
      </View>

      <View style={styles.metaCard}>
        <View style={[styles.metaIcon, { backgroundColor: theme.accentLight }]}>
          <Ionicons name="location" size={18} color={theme.accent} />
        </View>
        <View>
          <Text style={styles.metaLabel}>Location</Text>
          <Text style={styles.metaValue}>{location}</Text>
        </View>
      </View>

      <View style={styles.metaCard}>
        <View style={[styles.metaIcon, { backgroundColor: BaseColors.sageLight }]}>
          <Ionicons name="person" size={18} color={BaseColors.sage} />
        </View>
        <View>
          <Text style={styles.metaLabel}>Hosted by</Text>
          <Text style={styles.metaValue}>{churchName}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: BaseColors.brown400,
    marginBottom: 3,
  },
  metaValue: { fontSize: 14, color: BaseColors.brown900, lineHeight: 20 },
});
