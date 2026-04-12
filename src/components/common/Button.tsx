// src/components/common/Button.tsx
import React from 'react';
import {
  TouchableOpacity,
  Text,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { BaseColors, Typography, Spacing, Radius } from '../../constants/theme';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  accentColor?: string;
  style?: ViewStyle;
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  accentColor = BaseColors.sapphire,
  style,
}: ButtonProps) {
  const pressAnim = React.useRef(new Animated.Value(0)).current;

  const animatePress = (toValue: number) => {
    Animated.timing(pressAnim, {
      toValue,
      duration: toValue === 1 ? 110 : 150,
      easing: toValue === 1 ? Easing.out(Easing.quad) : Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (!loading && !disabled) onPress();
  };

  const isDisabled = loading || disabled;

  // Size styles
  const sizeStyles: Record<string, ViewStyle> = {
    small: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
    medium: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
    large: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl },
  };

  const textSizes: Record<string, TextStyle> = {
    small: Typography.body2 as TextStyle,
    medium: Typography.body1 as TextStyle,
    large: Typography.heading3 as TextStyle,
  };

  // Variant styles
  let containerStyle: ViewStyle = {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BaseColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    ...sizeStyles[size],
  };

  let textStyle: TextStyle = {
    fontWeight: '600',
    ...textSizes[size],
  };

  switch (variant) {
    case 'primary':
      containerStyle = {
        ...containerStyle,
        backgroundColor: isDisabled ? BaseColors.gray400 : accentColor,
      };
      textStyle = { ...textStyle, color: BaseColors.white };
      break;

    case 'secondary':
      containerStyle = {
        ...containerStyle,
        backgroundColor: isDisabled ? BaseColors.gray100 : BaseColors.gray200,
      };
      textStyle = { ...textStyle, color: BaseColors.gray800 };
      break;

    case 'outline':
      containerStyle = {
        ...containerStyle,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: isDisabled ? BaseColors.gray300 : accentColor,
      };
      textStyle = { ...textStyle, color: isDisabled ? BaseColors.gray500 : accentColor };
      break;

    case 'danger':
      containerStyle = {
        ...containerStyle,
        backgroundColor: isDisabled ? BaseColors.gray400 : BaseColors.red500,
      };
      textStyle = { ...textStyle, color: BaseColors.white };
      break;
  }

  return (
    <Animated.View
      style={{
        transform: [
          {
            scale: pressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.975],
            }),
          },
        ],
      }}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={() => !isDisabled && animatePress(1)}
        onPressOut={() => !isDisabled && animatePress(0)}
        disabled={isDisabled}
        activeOpacity={1}
        style={[containerStyle, style]}
      >
        {loading ? (
          <ActivityIndicator color={textStyle.color} size="small" />
        ) : (
          <Text style={textStyle}>{label}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
