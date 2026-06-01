import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BaseColors, Spacing } from '../../../constants/theme';

interface EventCapacityBarProps {
  attendeesCount: number;
  capacity: number;
  theme: any;
}

export const EventCapacityBar: React.FC<EventCapacityBarProps> = ({
  attendeesCount,
  capacity,
  theme,
}) => {
  const attendanceWidth = `${Math.min((attendeesCount / Math.max(capacity, 1)) * 100, 100)}%`;

  return (
    <View style={styles.capacitySection}>
      <View style={styles.capacityHeader}>
        <Text style={styles.sectionLabel}>Capacity</Text>
        <Text style={styles.capacityText}>
          {attendeesCount} / {capacity}
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
  );
};

const styles = StyleSheet.create({
  capacitySection: { marginBottom: Spacing.xl },
  capacityHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  sectionLabel: { fontSize: 14, color: BaseColors.brown900 },
  capacityText: { fontSize: 14, color: BaseColors.brown400 },
  capacityBar: { height: 6, backgroundColor: BaseColors.brown100, borderRadius: 3 },
  capacityFill: { height: '100%', borderRadius: 3 },
});
