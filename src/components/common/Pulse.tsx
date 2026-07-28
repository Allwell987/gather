// src/components/common/Pulse.tsx
import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface PulseProps {
  children: React.ReactNode;
  scale?: number;
  duration?: number;
}

export default function Pulse({
  children,
  scale = 1.15,
  duration = 1000,
}: PulseProps) {
  const pulse = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  useEffect(() => {
    // Reanimated shared values are mutable and intentionally updated here.
    // eslint-disable-next-line react-hooks/immutability
    pulse.value = withRepeat(
      withTiming(scale, {
        duration,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, [scale, duration, pulse]);

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
