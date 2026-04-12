// src/components/common/HeaderBar.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BaseColors, Typography, Spacing } from '../../constants/theme';

export interface HeaderBarProps {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  showBack?: boolean;
  rightAction?: () => void;
  rightIcon?: string;
  accentColor?: string;
  backgroundColor?: string;
  style?: ViewStyle;
}

export default function HeaderBar({
  title,
  subtitle,
  onBackPress,
  showBack = true,
  rightAction,
  rightIcon,
  accentColor = BaseColors.sapphire,
  backgroundColor = BaseColors.white,
  style,
}: HeaderBarProps) {
  return (
    <SafeAreaView style={[{ backgroundColor }, style]}>
      <View style={[styles.container, { backgroundColor }]}>
        {/* Left - Back Button */}
        {showBack && (
          <TouchableOpacity onPress={onBackPress} style={styles.leftButton}>
            <Ionicons name="arrow-back" size={24} color={BaseColors.gray900} />
          </TouchableOpacity>
        )}

        {/* Center - Title & Subtitle */}
        <View style={styles.center}>
          <Text style={[Typography.heading3 as any, { color: BaseColors.gray900 }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[Typography.caption as any, { color: BaseColors.gray600, marginTop: Spacing.xs }]}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right - Action Button */}
        {rightAction && rightIcon && (
          <TouchableOpacity onPress={rightAction} style={styles.rightButton}>
            <Ionicons name={rightIcon as any} size={24} color={accentColor} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BaseColors.gray100,
  },
  leftButton: {
    padding: Spacing.sm,
    marginLeft: -Spacing.sm,
  },
  center: {
    flex: 1,
    marginHorizontal: Spacing.md,
  },
  rightButton: {
    padding: Spacing.sm,
    marginRight: -Spacing.sm,
  },
});
