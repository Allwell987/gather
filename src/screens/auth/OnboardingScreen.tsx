// src/screens/auth/OnboardingScreen.tsx
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, Animated, Image, ScrollView } from 'react-native';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BaseColors, Typography, Spacing, Radius, CHURCH } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import type { AuthStackNavigationProp } from '../../types/navigation';

const { width, height } = Dimensions.get('window');
const showCompactArt = height < 720;

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

const slides = [
  {
    id: '1',
    icon: 'sparkles-outline',
    verse: '"Where two or three gather in my name, there am I with them."',
    ref: 'Matthew 18:20',
    title: 'Welcome to Gather',
    sub: `The digital home of ${CHURCH.name}`,
    eyebrow: 'Royal welcome',
  },
  {
    id: '2',
    icon: 'book-outline',
    verse: '"Trust in the Lord with all your heart and lean not on your own understanding."',
    ref: 'Proverbs 3:5',
    title: 'Grow in the Word',
    sub: 'Daily verses, reading plans, highlights, and notes in one calm rhythm.',
    eyebrow: 'Daily formation',
  },
  {
    id: '3',
    icon: 'people-outline',
    verse: '"And let us consider how we may spur one another on toward love and good deeds."',
    ref: 'Hebrews 10:24',
    title: 'Stay Connected',
    sub: 'Prayer, group chats, events, and live worship for the whole church family.',
    eyebrow: 'Church community',
  },
] as const;

export default function OnboardingScreen() {
  const navigation = useNavigation<AuthStackNavigationProp>();
  const { setIsGuest } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const swipeAnim = useRef(new Animated.Value(0)).current;

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
    if (nextIndex < slides.length) {
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    } else {
      navigation.navigate('Register');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[royal.midnight, royal.plum, royal.wine, royal.indigo]}
        locations={[0, 0.36, 0.72, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <LinearGradient
        colors={['rgba(245,220,164,0.22)', 'rgba(255,255,255,0)', 'rgba(216,168,78,0.14)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.royalWash}
      />
      <View style={styles.topRule} />
      <View style={styles.bottomRule} />

      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logoFrame}>
              <Image
                source={require('../../../assets/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.brandText}>
              <Text style={styles.appName}>Gather</Text>
              <Text style={styles.churchName}>{CHURCH.name}</Text>
            </View>
          </View>
          <View style={styles.locationPill}>
            <Ionicons name="location-outline" size={13} color={royal.goldSoft} />
            <Text style={styles.location}>{CHURCH.fullLocation}</Text>
          </View>
        </View>

        <Animated.FlatList
          ref={flatListRef}
          style={styles.flatList}
          data={slides}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          keyboardDismissMode="on-drag"
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrentIndex(index);
          }}
          onScrollToIndexFailed={(info) => {
            const wait = new Promise((resolve) => setTimeout(resolve, 500));
            wait.then(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
            });
          }}
          renderItem={({ item, index }) => (
            <View style={styles.slide}>
              <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.slideScrollContent}
                bounces={false}
              >
                <View style={styles.slideArt}>
                  <LinearGradient
                    colors={['rgba(245,220,164,0.28)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                    style={styles.artHalo}
                  >
                    {index === 0 ? (
                      <LottieView
                        source={require('../../../assets/animations/welcome.json')}
                        autoPlay
                        loop
                        style={styles.lottie}
                      />
                    ) : (
                      <View style={styles.slideIconWrap}>
                        <Ionicons name={item.icon} size={52} color={royal.goldSoft} />
                      </View>
                    )}
                  </LinearGradient>
                </View>

                <View style={styles.verseCard}>
                  <View style={styles.verseHeader}>
                    <Ionicons name={item.icon} size={14} color={royal.goldSoft} />
                    <Text style={styles.verseEye}>{item.eyebrow}</Text>
                  </View>
                  <Text style={styles.verseText}>{item.verse}</Text>
                  <Text style={styles.verseRef}>{item.ref}</Text>
                </View>

                <Text style={styles.slideTitle} numberOfLines={2} adjustsFontSizeToFit>{item.title}</Text>
                <Text style={styles.slideSub}>{item.sub}</Text>
              </ScrollView>
            </View>
          )}
        />

        {/* Swipe gesture indicator - only show on first slide */}
        {currentIndex === 0 && (
          <View style={styles.swipeIndicatorContainer}>
            <Animated.View style={[styles.swipeArrow, { transform: [{ translateX: swipeAnim }] }]}>
              <Ionicons name="arrow-forward" size={18} color={royal.goldSoft} />
            </Animated.View>
            <Animated.View
              style={[styles.swipeArrow, { opacity: swipeAnim.interpolate({
                inputRange: [0, 10, 20],
                outputRange: [0.3, 0.6, 0.1],
              }), transform: [{ translateX: swipeAnim.interpolate({
                inputRange: [0, 20],
                outputRange: [0, 15],
              }) }] }]}
            >
              <Ionicons name="arrow-forward" size={18} color={royal.goldSoft} />
            </Animated.View>
            <Text style={styles.swipeHint}>Swipe for more</Text>
          </View>
        )}

        {/* Progress dots */}
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
                key={i}
                style={[styles.dot, { width: dotWidth, opacity }]}
              />
            );
          })}
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} activeOpacity={0.85}>
            <LinearGradient
              colors={[royal.goldSoft, royal.gold, '#b97b25']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryGradient}
            >
            <Text style={styles.primaryBtnText}>
              {currentIndex < slides.length - 1 ? 'Next' : 'Get started'}
            </Text>
              <Ionicons name={currentIndex < slides.length - 1 ? 'arrow-forward' : 'checkmark'} size={18} color={royal.midnight} />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Ionicons name="log-in-outline" size={16} color={royal.goldSoft} />
            <Text style={styles.secondaryBtnText}>I already have an account</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.guestBtn}
            onPress={() => setIsGuest(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="eye-outline" size={15} color={royal.mist} />
            <Text style={styles.guestBtnText}>Browse as guest</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: royal.midnight },
  safe: { flex: 1 },
  flatList: { flex: 1 },
  royalWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '58%',
  },
  topRule: {
    position: 'absolute',
    top: 56,
    left: Spacing['2xl'],
    right: Spacing['2xl'],
    height: 1,
    backgroundColor: 'rgba(245,220,164,0.22)',
  },
  bottomRule: {
    position: 'absolute',
    left: Spacing['2xl'],
    right: Spacing['2xl'],
    bottom: 126,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  header: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  logoFrame: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: royal.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 48, height: 48 },
  brandText: { flex: 1 },
  appName: {
    fontFamily: Typography.serif,
    fontSize: Typography.sizes['3xl'],
    color: royal.pearl,
  },
  churchName: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.sm,
    color: royal.goldSoft,
    lineHeight: 18,
  },
  locationPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(245,220,164,0.2)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
  },
  location: {
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.sm,
    color: royal.mist,
  },
  slide: {
    width,
  },
  slideScrollContent: {
    paddingHorizontal: Spacing['2xl'],
    alignItems: 'center',
    paddingBottom: Spacing.xl,
  },
  slideArt: {
    height: showCompactArt ? 96 : 136,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  artHalo: {
    width: showCompactArt ? 96 : 124,
    height: showCompactArt ? 96 : 124,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: royal.border,
  },
  lottie: {
    width: showCompactArt ? 112 : 150,
    height: showCompactArt ? 112 : 150,
  },
  slideIconWrap: {
    width: 82,
    height: 82,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(18,13,35,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verseCard: {
    backgroundColor: royal.glass,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: royal.border,
    marginBottom: Spacing.xl,
    width: '100%',
  },
  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: Spacing.sm,
  },
  verseEye: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: royal.goldSoft,
  },
  verseText: {
    fontFamily: Typography.serifItalic,
    fontSize: Typography.sizes.lg,
    color: royal.pearl,
    lineHeight: 26,
    marginBottom: Spacing.sm,
  },
  verseRef: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.sm,
    color: royal.goldSoft,
  },
  slideTitle: {
    fontFamily: Typography.serif,
    fontSize: Typography.sizes['4xl'],
    color: royal.pearl,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  slideSub: {
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.base,
    color: royal.mist,
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 310,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  dot: { height: 6, borderRadius: 3, backgroundColor: royal.goldSoft },
  buttons: { paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing.xl, gap: Spacing.md },
  primaryBtn: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
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
  swipeArrow: {
    position: 'absolute',
  },
  swipeHint: {
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.sm,
    color: royal.mist,
    marginTop: 24,
  },
});
