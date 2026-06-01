// src/components/common/HeaderBar.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Platform,
  Appearance,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BaseColors, Typography, Spacing } from '../../constants/theme';

import { useThemeStore } from '../../store/themeStore';

export interface HeaderBarProps {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  showBack?: boolean;
  rightAction?: () => void;
  rightIcon?: string;
  rightElement?: React.ReactNode;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  subtitleColor?: string;
  style?: ViewStyle;
  enableBlur?: boolean;
  blurIntensity?: number;
  blurTint?: 'light' | 'dark' | 'default';
}

export default function HeaderBar({
  title,
  subtitle,
  onBackPress,
  showBack = true,
  rightAction,
  rightIcon,
  rightElement,
  accentColor,
  backgroundColor,
  textColor,
  subtitleColor,
  style,
  enableBlur = false,
  blurIntensity = 80,
  blurTint,
}: HeaderBarProps) {
  const { colors, theme, themeMode } = useThemeStore();
  const HeaderContainer = enableBlur && Platform.OS === 'ios' ? BlurView : View;

  // Use theme colors as defaults if not provided
  const finalBgColor = backgroundColor || (enableBlur ? 'transparent' : colors.card);
  const finalTextColor = textColor || colors.text;
  const finalSubtitleColor = subtitleColor || colors.textSecondary;
  const finalAccentColor = accentColor || theme.accent;
  const currentColorScheme = themeMode === 'system' ? Appearance.getColorScheme() : themeMode;
  const finalBlurTint = blurTint || (currentColorScheme === 'dark' ? 'dark' : 'light');

  return (
    <SafeAreaView edges={['top']} style={[
      { backgroundColor: enableBlur ? 'transparent' : finalBgColor },
      style,
      enableBlur && styles.blurSafeArea
    ]}>
      <HeaderContainer
        intensity={blurIntensity}
        tint={finalBlurTint}
        style={[
          styles.container,
          { backgroundColor: enableBlur ? 'transparent' : finalBgColor, borderBottomColor: colors.border },
          enableBlur && styles.blurContainer
        ]}
      >
        {/* Left - Back Button */}
        {showBack && (
          <TouchableOpacity onPress={onBackPress} style={styles.leftButton}>
            <Ionicons name="arrow-back" size={24} color={finalTextColor} />
          </TouchableOpacity>
        )}

        {/* Center - Title & Subtitle */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.center}>
          <Text style={[Typography.heading3 as any, { color: finalTextColor }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[Typography.caption as any, { color: finalSubtitleColor, marginTop: Spacing.xs }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </Animated.View>

        {/* Right - Action Button */}
        {rightElement ? (
          <View style={styles.rightButton}>
            {rightElement}
          </View>
        ) : rightAction && rightIcon ? (
          <TouchableOpacity onPress={rightAction} style={styles.rightButton}>
            <Ionicons name={rightIcon as any} size={24} color={finalAccentColor} />
          </TouchableOpacity>
        ) : null}
      </HeaderContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  blurSafeArea: {
    backgroundColor: 'transparent',
  },
  blurContainer: {
    borderBottomWidth: 0,
  },
  leftButton: {
    marginRight: Spacing.md,
  },
  center: {
    flex: 1,
  },
  rightButton: {
    marginLeft: Spacing.md,
  },
});
