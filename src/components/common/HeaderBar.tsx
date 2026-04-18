// src/components/common/HeaderBar.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BaseColors, Typography, Spacing } from '../../constants/theme';

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
  accentColor = BaseColors.sapphire,
  backgroundColor = BaseColors.white,
  textColor = BaseColors.gray900,
  subtitleColor = BaseColors.gray600,
  style,
  enableBlur = false,
  blurIntensity = 80,
  blurTint = 'light',
}: HeaderBarProps) {
  const HeaderContainer = enableBlur && Platform.OS === 'ios' ? BlurView : View;

  return (
    <SafeAreaView edges={['top']} style={[
      { backgroundColor: enableBlur ? 'transparent' : backgroundColor },
      style,
      enableBlur && styles.blurSafeArea
    ]}>
      <HeaderContainer
        intensity={blurIntensity}
        tint={blurTint}
        style={[
          styles.container,
          { backgroundColor: enableBlur ? 'transparent' : backgroundColor },
          enableBlur && styles.blurContainer
        ]}
      >
        {/* Left - Back Button */}
        {showBack && (
          <TouchableOpacity onPress={onBackPress} style={styles.leftButton}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
        )}

        {/* Center - Title & Subtitle */}
        <View style={styles.center}>
          <Text style={[Typography.heading3 as any, { color: textColor }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[Typography.caption as any, { color: subtitleColor, marginTop: Spacing.xs }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right - Action Button */}
        {rightElement ? (
          <View style={styles.rightButton}>
            {rightElement}
          </View>
        ) : rightAction && rightIcon ? (
          <TouchableOpacity onPress={rightAction} style={styles.rightButton}>
            <Ionicons name={rightIcon as any} size={24} color={accentColor} />
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
    borderBottomColor: BaseColors.gray200,
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
