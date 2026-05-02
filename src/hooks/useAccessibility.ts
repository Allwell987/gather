import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Accessibility utilities for the Gather app
 */

/**
 * Check if the device has reduced motion enabled
 */
export const useReducedMotion = () => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((result: boolean) => {
      setReducedMotion(result);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isReduced: boolean) => setReducedMotion(isReduced)
    );

    return () => subscription.remove();
  }, []);

  return reducedMotion;
};

/**
 * Check if the device is running in bold text mode
 */
export const useBoldText = () => {
  const [boldText, setBoldText] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isBoldTextEnabled().then((result: boolean) => {
      setBoldText(result);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'boldTextChanged',
      (isBold: boolean) => setBoldText(isBold)
    );

    return () => subscription.remove();
  }, []);

  return boldText;
};

/**
 * Check if the device is running in inverted color mode
 */
export const useInvertedColors = () => {
  const [invertedColors, setInvertedColors] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isInvertColorsEnabled().then((result: boolean) => {
      setInvertedColors(result);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'invertColorsChanged',
      (isInverted: boolean) => setInvertedColors(isInverted)
    );

    return () => subscription.remove();
  }, []);

  return invertedColors;
};

/**
 * Check if screen reader is currently active
 */
export const useScreenReader = () => {
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then((result: boolean) => {
      setScreenReaderEnabled(result);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (isEnabled: boolean) => setScreenReaderEnabled(isEnabled)
    );

    return () => subscription.remove();
  }, []);

  return screenReaderEnabled;
};

/**
 * Generate accessibility props for touchable elements
 */
export const getAccessibilityProps = (
  label: string,
  hint?: string,
  role: 'button' | 'link' | 'image' | 'checkbox' | 'radio' | 'search' | 'header' = 'button'
) => {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: role,
  };
};

/**
 * Minimum touch target size (44x44 on iOS, 48x48 on Android)
 */
export const MIN_TOUCH_SIZE = Platform.select({
  ios: 44,
  android: 48,
  default: 44,
});

/**
 * Large touch target for important actions
 */
export const LARGE_TOUCH_SIZE = Platform.select({
  ios: 60,
  android: 64,
  default: 60,
});