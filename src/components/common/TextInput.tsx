// src/components/common/TextInput.tsx
import React from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps as RNTextInputProps,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { Spacing, Radius } from '../../constants/theme';

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  icon?: string;
  iconColor?: string;
  accentColor?: string;
  containerStyle?: ViewStyle;
}

export default function TextInput({
  label,
  error,
  icon,
  iconColor,
  accentColor,
  containerStyle,
  ...inputProps
}: TextInputProps) {
  const { colors, typography } = useThemeStore();
  const [isFocused, setIsFocused] = React.useState(false);
  const [focusAnim] = React.useState(() => new Animated.Value(0));

  const finalAccentColor = accentColor || colors.accent;
  const finalIconColor = iconColor || colors.textSecondary;

  React.useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [focusAnim, isFocused]);

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={[typography.body2 as any, { color: colors.textSecondary, marginBottom: Spacing.xs, fontWeight: '500' }]}>
          {label}
        </Text>
      )}

      <Animated.View
        style={[
          styles.inputContainer,
          {
            borderColor: error
              ? colors.error
              : isFocused
                ? finalAccentColor
                : colors.border,
            backgroundColor: colors.surface,
            borderWidth: isFocused ? 2 : 1,
            shadowColor: finalAccentColor,
            shadowOpacity: focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.1] }),
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
          },
        ]}
      >
        {icon && <Ionicons name={icon as any} size={20} color={isFocused ? finalAccentColor : finalIconColor} style={{ marginRight: Spacing.sm }} />}

        <RNTextInput
          {...inputProps}
          onFocus={(e) => {
            setIsFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            inputProps.onBlur?.(e);
          }}
          style={[styles.input, typography.body2 as any, { color: colors.text }]}
          placeholderTextColor={colors.textMuted}
        />
      </Animated.View>

      {error && (
        <Text style={[typography.caption as any, { color: colors.error, marginTop: Spacing.xs }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    elevation: 0,
  },
  input: {
    flex: 1,
  },
});
