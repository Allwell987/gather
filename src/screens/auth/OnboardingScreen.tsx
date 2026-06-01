// src/screens/auth/OnboardingScreen.tsx
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { SLIDES } from './constants/onboardingSlides';
import { OnboardingSlide } from './components/OnboardingSlide';
import { OnboardingDots } from './components/OnboardingDots';
import type { AuthStackNavigationProp } from '../../types/navigation';


const royal = {
  midnight: '#120d23',
  plum: '#211235',
  wine: '#4d1533',
  indigo: '#172554',
  gold: '#d8a84e',
  goldSoft: '#f5dca4',
  pearl: '#fff8ed',
  mist: 'rgba(255,248,237,0.72)',
  glass: 'rgba(255,255,255,0.09)',
  border: 'rgba(245,220,164,0.24)',
};

export default function OnboardingScreen() {
  const navigation = useNavigation<AuthStackNavigationProp>();
  const { setIsGuest } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const [scrollX] = useState(() => new Animated.Value(0));
  const [swipeAnim] = useState(() => new Animated.Value(0));

  // Animate the swipe indicator
  React.useEffect(() => {
    if (currentIndex === 0) {
      const swipeAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(swipeAnim, {
            toValue: 20,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(swipeAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      swipeAnimation.start();
      return () => swipeAnimation.stop();
    }
  }, [currentIndex, swipeAnim]);

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < SLIDES.length) {
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    } else {
      navigation.navigate('Register');
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 50 }), []);

  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[royal.midnight, royal.plum, royal.wine]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe}>
        <View style={styles.top}>
          <FlatList
            ref={flatListRef}
            data={SLIDES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            onViewableItemsChanged={handleViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            renderItem={({ item }) => <OnboardingSlide item={item} royal={royal} />}
            keyExtractor={(item) => item.id}
          />
        </View>

        <View style={styles.bottom}>
          <OnboardingDots slides={SLIDES as any} scrollX={scrollX} royal={royal} />

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
              <LinearGradient colors={[royal.gold, '#b38a3d']} style={styles.primaryGradient}>
                <Text style={styles.primaryBtnText}>
                  {currentIndex === SLIDES.length - 1 ? 'GET STARTED' : 'CONTINUE'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color={royal.midnight} />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.secondaryBtnText}>Sign in to account</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.guestBtn} onPress={() => setIsGuest(true)}>
              <Text style={styles.guestBtnText}>Continue as Guest</Text>
              <Ionicons name="chevron-forward" size={14} color={royal.mist} />
            </TouchableOpacity>
          </View>

          {currentIndex === 0 && (
            <View style={styles.swipeIndicatorContainer}>
              <Animated.View style={[styles.swipeArrow, { transform: [{ translateX: swipeAnim }] }]}>
                <Ionicons name="arrow-forward" size={20} color={royal.goldSoft} />
              </Animated.View>
              <Text style={styles.swipeHint}>Swipe to explore</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  top: { flex: 3 },
  bottom: { flex: 2, justifyContent: 'flex-end', paddingBottom: Spacing.xl },
  buttons: { paddingHorizontal: Spacing['2xl'], gap: Spacing.md },
  primaryBtn: { borderRadius: Radius.lg, overflow: 'hidden' },
  primaryGradient: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 15,
    paddingHorizontal: Spacing.lg,
  },
  primaryBtnText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.md,
    color: royal.midnight,
  },
  secondaryBtn: {
    minHeight: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(245,220,164,0.2)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  secondaryBtnText: {
    fontFamily: Typography.sansMedium,
    fontSize: Typography.sizes.base,
    color: royal.pearl,
  },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
  },
  guestBtnText: {
    fontFamily: Typography.sansMedium,
    fontSize: Typography.sizes.sm,
    color: royal.mist,
  },
  swipeIndicatorContainer: {
    alignItems: 'center',
    marginTop: Spacing.md,
    minHeight: 34,
  },
  swipeArrow: { position: 'absolute' },
  swipeHint: {
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.sm,
    color: royal.mist,
    marginTop: 24,
  },
});
