// src/components/common/ErrorMessage.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseColors, Typography, Spacing, Radius } from '../../constants/theme';

export interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
  style?: ViewStyle;
}

export default function ErrorMessage({
  message,
  onDismiss,
  style,
}: ErrorMessageProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <Ionicons name="alert-circle" size={20} color={BaseColors.red600} />
        <Text style={[Typography.body2 as any, styles.text]}>
          {message}
        </Text>
      </View>
      {onDismiss && (
        <Ionicons
          name="close"
          size={20}
          color={BaseColors.red600}
          onPress={onDismiss}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: BaseColors.red50,
    borderRadius: Radius.md,
    borderLeftWidth: 4,
    borderLeftColor: BaseColors.red600,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  text: {
    color: BaseColors.red700,
    flex: 1,
  },
});
