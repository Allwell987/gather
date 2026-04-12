// src/components/common/Card.tsx
import React from 'react';
import {
  View,
  ViewStyle,
} from 'react-native';
import { BaseColors, Spacing, Radius } from '../../constants/theme';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
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
  let containerStyle: ViewStyle = {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    overflow: 'hidden',
  };

  switch (variant) {
    case 'elevated':
      containerStyle = {
        ...containerStyle,
        backgroundColor: '#fffdf9',
        borderWidth: 1,
        borderColor: BaseColors.warm100,
        // iOS shadow
        shadowColor: BaseColors.black,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        // Android elevation
        elevation: 2,
      };
      break;

    case 'outlined':
      containerStyle = {
        ...containerStyle,
        backgroundColor: BaseColors.white,
        borderWidth: 1,
        borderColor: accentBorder && accentColor ? accentColor : BaseColors.gray200,
      };
      break;

    case 'filled':
      containerStyle = {
        ...containerStyle,
        backgroundColor: BaseColors.warm50,
        borderWidth: 1,
        borderColor: BaseColors.warm100,
      };
      break;
  }

  return <View style={[containerStyle, style]}>{children}</View>;
}
