import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useThemeStore } from '../../store/themeStore';
import { BaseColors, Radius } from '../../constants/theme';

export interface GlassViewProps {
  children: React.ReactNode;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  style?: ViewStyle;
  borderRadius?: number;
  showBorder?: boolean;
  showGlow?: boolean;
}

/**
 * A reusable component that implements the "Liquid Glass" effect.
 * Uses real-time blur on supported platforms and falls back to
 * semi-transparent backgrounds on others.
 */
export default function GlassView({
  children,
  intensity = 60,
  tint,
  style,
  borderRadius = Radius.lg,
  showBorder = true,
  showGlow = true,
}: GlassViewProps) {
  const { colors, themeMode } = useThemeStore();

  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.themeMode === 'dark');
  const finalTint = tint || (isDark ? 'dark' : 'light');

  const glassStyle: ViewStyle = {
    borderRadius,
    overflow: 'hidden',
    backgroundColor: colors.glassBg,
    ...(showBorder && {
      borderWidth: 1,
      borderColor: isDark ? BaseColors.glassBorderDark : BaseColors.glassBorderLight,
    }),
  };

  return (
    <View style={[glassStyle, style]}>
      <BlurView
        intensity={intensity}
        tint={finalTint}
        style={StyleSheet.absoluteFill}
      />
      {showGlow && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark ? BaseColors.glassGlowDark : BaseColors.glassGlowLight,
              opacity: 0.5
            }
          ]}
        />
      )}
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </View>
  );
}
