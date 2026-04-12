import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BaseColors, Radius, Spacing, Typography } from '../constants/theme';
import { useThemeStore } from '../store/themeStore';
import { useToastStore, type ToastVariant } from '../store/toastStore';

const TOAST_VARIANT_CONFIG: Record<ToastVariant, {
  icon: keyof typeof Ionicons.glyphMap;
  backgroundColor: string;
  borderColor: string;
  iconColor: string;
}> = {
  info: {
    icon: 'information-circle',
    backgroundColor: BaseColors.white,
    borderColor: BaseColors.brown100,
    iconColor: BaseColors.sapphire,
  },
  success: {
    icon: 'checkmark-circle',
    backgroundColor: BaseColors.sageLight,
    borderColor: '#cfe3d4',
    iconColor: BaseColors.sage,
  },
  warning: {
    icon: 'alert-circle',
    backgroundColor: BaseColors.warm100,
    borderColor: '#f0d7a1',
    iconColor: BaseColors.gold,
  },
  error: {
    icon: 'close-circle',
    backgroundColor: BaseColors.dangerLight,
    borderColor: '#efc8c5',
    iconColor: BaseColors.danger,
  },
};

export default function ToastHost() {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const { currentToast, hideToast } = useToastStore();
  const translateY = useRef(new Animated.Value(-28)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: currentToast ? 0 : -28,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: currentToast ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentToast, opacity, translateY]);

  const variantConfig = useMemo(() => {
    if (!currentToast) {
      return TOAST_VARIANT_CONFIG.info;
    }

    if (currentToast.variant === 'info') {
      return {
        ...TOAST_VARIANT_CONFIG.info,
        iconColor: theme.accent,
        borderColor: theme.accentBorder,
      };
    }

    return TOAST_VARIANT_CONFIG[currentToast.variant];
  }, [currentToast, theme.accent, theme.accentBorder]);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        pointerEvents={currentToast ? 'auto' : 'none'}
        style={[
          styles.wrapper,
          {
            paddingTop: insets.top + Spacing.md,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        {currentToast ? (
          <Pressable
            style={[
              styles.toast,
              {
                backgroundColor: variantConfig.backgroundColor,
                borderColor: variantConfig.borderColor,
              },
            ]}
            onPress={hideToast}
          >
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: `${variantConfig.iconColor}18` },
              ]}
            >
              {currentToast.variant === 'success' ? (
                <LottieView
                  source={require('../../assets/animations/success-check.json')}
                  autoPlay
                  loop={false}
                  style={{ width: 28, height: 28 }}
                />
              ) : (
                <Ionicons name={variantConfig.icon} size={18} color={variantConfig.iconColor} />
              )}
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>{currentToast.title}</Text>
              {currentToast.message ? (
                <Text style={styles.message}>{currentToast.message}</Text>
              ) : null}
            </View>
            <Ionicons name="close" size={16} color={BaseColors.brown300} />
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: Spacing.lg,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.sm,
    color: BaseColors.brown900,
  },
  message: {
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.sm,
    color: BaseColors.brown400,
    lineHeight: 18,
    marginTop: 2,
  },
});
