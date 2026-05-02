// src/components/common/EmptyState.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { BaseColors, Typography, Spacing } from '../../constants/theme';

export interface EmptyStateProps {
  emoji?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  style?: ViewStyle;
}

export default function EmptyState({
  emoji = '📭',
  title,
  description,
  action,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[Typography.heading2 as any, { color: BaseColors.gray900, marginTop: Spacing.lg }]}>
        {title}
      </Text>
      {description && (
        <Text
          style={[
            Typography.body2 as any,
            { color: BaseColors.gray600, marginTop: Spacing.sm, textAlign: 'center' },
          ]}
        >
          {description}
        </Text>
      )}
      {action && <View style={{ marginTop: Spacing.lg }}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.lg,
  },
  emoji: {
    fontSize: 64,
  },
});
