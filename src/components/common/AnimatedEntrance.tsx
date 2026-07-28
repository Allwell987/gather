// src/components/common/AnimatedEntrance.tsx
import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface AnimatedEntranceProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  offset?: number;
}

export default function AnimatedEntrance({
  children,
  delay = 0,
  duration = 500,
  offset = 20,
}: AnimatedEntranceProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(offset);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    // Reanimated shared values are mutable and intentionally updated here.
    // eslint-disable-next-line react-hooks/immutability
    opacity.value = withDelay(
      delay,
      withTiming(1, {
        duration,
        easing: Easing.out(Easing.back(1.5)),
      })
    );
    // eslint-disable-next-line react-hooks/immutability
    translateY.value = withDelay(
      delay,
      withTiming(0, {
        duration,
        easing: Easing.out(Easing.back(1.5)),
      })
    );
  }, [delay, duration, opacity, translateY]);

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
