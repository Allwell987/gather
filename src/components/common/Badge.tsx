// src/components/common/Badge.tsx
import React from 'react';
import {
  View,
  Text,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { BaseColors, Typography, Spacing, Radius } from '../../constants/theme';

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
  accentColor = BaseColors.sapphire,
  style,
}: BadgeProps) {
  const isSmall = size === 'small';

  let backgroundColor = BaseColors.gray200;
  let textColor = BaseColors.gray800;

  switch (variant) {
    case 'primary':
      backgroundColor = accentColor;
      textColor = BaseColors.white;
      break;
    case 'secondary':
      backgroundColor = BaseColors.gray100;
      textColor = BaseColors.gray700;
      break;
    case 'success':
      backgroundColor = BaseColors.green100;
      textColor = BaseColors.green700;
      break;
    case 'warning':
      backgroundColor = BaseColors.yellow100;
      textColor = BaseColors.yellow700;
      break;
    case 'danger':
      backgroundColor = BaseColors.red100;
      textColor = BaseColors.red700;
      break;
  }

  const containerStyle: ViewStyle = {
    backgroundColor,
    borderRadius: Radius.md,
    paddingVertical: isSmall ? Spacing.xs : Spacing.sm,
    paddingHorizontal: isSmall ? Spacing.sm : Spacing.md,
    alignSelf: 'flex-start',
  };

  const textStyle: TextStyle = {
    ...(isSmall ? Typography.caption : Typography.body2),
    color: textColor,
    fontWeight: '600',
  };

  return (
    <View style={[containerStyle, style]}>
      <Text style={textStyle}>{label}</Text>
    </View>
  );
}
