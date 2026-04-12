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
import { BaseColors, Typography, Spacing, Radius } from '../../constants/theme';

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
  iconColor = BaseColors.gray600,
  accentColor = BaseColors.sapphire,
  containerStyle,
  ...inputProps
}: TextInputProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const focusAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: isFocused ? 170 : 220,
      easing: isFocused ? Easing.out(Easing.quad) : Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [focusAnim, isFocused]);

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={[Typography.body2 as any, { color: BaseColors.gray700, marginBottom: Spacing.xs }]}>
          {label}
        </Text>
      )}

      <Animated.View
        style={[
          styles.inputContainer,
          {
            borderColor: error
              ? BaseColors.red500
              : isFocused
                ? accentColor
                : BaseColors.gray300,
            backgroundColor: BaseColors.white,
            shadowOpacity: focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0.02, 0.09] }),
            transform: [
              {
                scale: focusAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.005] }),
              },
            ],
          },
        ]}
      >
        {icon && <Ionicons name={icon as any} size={20} color={iconColor} style={{ marginRight: Spacing.sm }} />}

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
          style={[styles.input, Typography.body2 as any]}
          placeholderTextColor={BaseColors.gray400}
        />
      </Animated.View>

      {error && (
        <Text style={[Typography.caption as any, { color: BaseColors.red500, marginTop: Spacing.xs }]}>
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
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    shadowColor: BaseColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  input: {
    flex: 1,
    color: BaseColors.gray900,
  },
});
