// src/components/common/Badge.tsx
import React from 'react';
import {
  View,
  Text,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { Spacing, Radius } from '../../constants/theme';

export interface BadgeProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'small' | 'medium';
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
}

export default function Badge({
  label,
  variant = 'primary',
  size = 'small',
  accentColor,
  style,
}: BadgeProps) {
  const { colors, typography } = useThemeStore();
  const isSmall = size === 'small';

  const finalAccentColor = accentColor || colors.accent;

  let backgroundColor = colors.border;
  let textColor = colors.textSecondary;

  switch (variant) {
    case 'primary':
      backgroundColor = finalAccentColor;
      textColor = '#fff';
      break;
    case 'secondary':
      backgroundColor = colors.background;
      textColor = colors.textSecondary;
      break;
    case 'success':
      backgroundColor = colors.success + '20'; // 12% opacity
      textColor = colors.success;
      break;
    case 'warning':
      backgroundColor = '#f59e0b20';
      textColor = '#d97706';
      break;
    case 'danger':
      backgroundColor = colors.error + '20';
      textColor = colors.error;
      break;
  }

  const containerStyle: ViewStyle = {
    backgroundColor,
    borderRadius: Radius.sm,
    paddingVertical: isSmall ? 2 : Spacing.xs,
    paddingHorizontal: isSmall ? Spacing.sm : Spacing.md,
    alignSelf: 'flex-start',
    borderWidth: variant === 'secondary' ? 1 : 0,
    borderColor: colors.border,
  };

  const textStyle: TextStyle = {
    ...(isSmall ? typography.caption : typography.body2),
    color: textColor,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontSize: isSmall ? 10 : 12,
  };

  return (
    <View style={[containerStyle, style]}>
      <Text style={textStyle}>{label.toUpperCase()}</Text>
    </View>
  );
}
