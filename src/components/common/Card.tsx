// src/components/common/Card.tsx
import React from 'react';
import {
  View,
  ViewStyle,
} from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { Spacing, Radius } from '../../constants/theme';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled' | 'glass';
  accentBorder?: boolean;
  accentColor?: string;
  style?: ViewStyle;
}

export default function Card({
  children,
  variant = 'elevated',
  accentBorder = false,
  accentColor,
  style,
}: CardProps) {
  const { colors } = useThemeStore();

  let containerStyle: ViewStyle = {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    overflow: 'hidden',
  };

  switch (variant) {
    case 'elevated':
      containerStyle = {
        ...containerStyle,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        // iOS shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        // Android elevation
        elevation: 3,
      };
      break;

    case 'outlined':
      containerStyle = {
        ...containerStyle,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: accentBorder && accentColor ? accentColor : colors.border,
      };
      break;

    case 'filled':
      containerStyle = {
        ...containerStyle,
        backgroundColor: colors.background === '#fcfaf7' ? '#f1f5f9' : '#1e293b',
        borderWidth: 0,
      };
      break;

    case 'glass':
      containerStyle = {
        ...containerStyle,
        backgroundColor: colors.themeMode === 'dark' ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.7)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
      };
      break;
  }

  return <View style={[containerStyle, style]}>{children}</View>;
}
