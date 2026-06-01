import React from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Spacing } from '../../../constants/theme';
import type { OnboardingSlideData } from '../constants/onboardingSlides';

const { width } = Dimensions.get('window');

interface OnboardingDotsProps {
  slides: OnboardingSlideData[];
  scrollX: Animated.Value;
  royal: any;
}

export const OnboardingDots: React.FC<OnboardingDotsProps> = ({ slides, scrollX, royal }) => {
  return (
    <View style={styles.dotsRow}>
      {slides.map((_, i) => {
        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [6, 20, 6],
          extrapolate: 'clamp',
        });
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={i.toString()}
            style={[styles.dot, { width: dotWidth, opacity, backgroundColor: royal.goldSoft }]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  dot: { height: 6, borderRadius: 3 },
});
