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
import * as Haptics from 'expo-haptics';
import { useThemeStore } from '../../store/themeStore';
import { BaseColors, Spacing, Radius } from '../../constants/theme';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
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
  accentColor,
  style,
}: ButtonProps) {
  const { colors, typography } = useThemeStore();
  const [pressAnim] = React.useState(() => new Animated.Value(0));

  const finalAccentColor = accentColor || colors.accent;

  const animatePress = (toValue: number) => {
    Animated.timing(pressAnim, {
      toValue,
      duration: toValue === 1 ? 80 : 120,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (!loading && !disabled) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const isDisabled = loading || disabled;

  // Size styles
  const sizeStyles: Record<string, ViewStyle> = {
    small: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
    medium: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
    large: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl },
  };

  const textSizes: Record<string, TextStyle> = {
    small: typography.body2 as TextStyle,
    medium: typography.body1 as TextStyle,
    large: typography.heading3 as TextStyle,
  };

  // Variant styles
  let containerStyle: ViewStyle = {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...sizeStyles[size],
  };

  let textStyle: TextStyle = {
    fontWeight: '600',
    ...textSizes[size],
    letterSpacing: 0.5,
  };

  switch (variant) {
    case 'primary':
      containerStyle = {
        ...containerStyle,
        backgroundColor: isDisabled ? colors.textMuted : finalAccentColor,
        shadowColor: finalAccentColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
      };
      textStyle = { ...textStyle, color: BaseColors.white };
      break;

    case 'secondary':
      containerStyle = {
        ...containerStyle,
        backgroundColor: isDisabled ? colors.background : colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      };
      textStyle = { ...textStyle, color: colors.text };
      break;

    case 'outline':
      containerStyle = {
        ...containerStyle,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: isDisabled ? colors.textMuted : finalAccentColor,
      };
      textStyle = { ...textStyle, color: isDisabled ? colors.textMuted : finalAccentColor };
      break;

    case 'danger':
      containerStyle = {
        ...containerStyle,
        backgroundColor: isDisabled ? colors.textMuted : colors.error,
      };
      textStyle = { ...textStyle, color: BaseColors.white };
      break;

    case 'ghost':
      containerStyle = {
        ...containerStyle,
        backgroundColor: 'transparent',
      };
      textStyle = { ...textStyle, color: colors.textSecondary };
      break;
  }

  return (
    <Animated.View
      style={{
        transform: [
          {
            scale: pressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.96],
            }),
          },
        ],
        opacity: pressAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.9],
        }),
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
