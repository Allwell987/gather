import React from 'react';
import { Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Typography, Spacing } from '../../../constants/theme';
import type { FilterTab } from '../types';

interface PrayerTabsProps {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  theme: any;
  colors: any;
  headerOpacity: Animated.Value;
}

const TABS: FilterTab[] = ['All', 'Mine', 'Answered', 'Urgent'];

export const PrayerTabs: React.FC<PrayerTabsProps> = ({
  activeTab,
  onTabChange,
  theme,
  colors,
  headerOpacity,
}) => {
  return (
    <Animated.View
      style={[
        styles.tabs,
        { backgroundColor: colors.card, borderBottomColor: colors.border, opacity: headerOpacity },
      ]}
    >
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && { borderBottomColor: theme.accent }]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onTabChange(tab);
          }}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.textSecondary },
              activeTab === tab && { color: theme.accent, fontFamily: Typography.sansSemiBold },
            ]}
          >
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontFamily: Typography.sansMedium, fontSize: Typography.sizes.sm },
});
