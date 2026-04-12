// src/screens/auth/OnboardingScreen.tsx
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, Animated, Image } from 'react-native';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BaseColors, Typography, Spacing, CHURCH } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import type { AuthStackNavigationProp } from '../../types/navigation';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    verse: '"Where two or three gather in my name, there am I with them."',
    ref: 'Matthew 18:20',
    title: 'Welcome to Gather',
    sub: `The digital home of\n${CHURCH.name}`,
  },
  {
    id: '2',
    verse: '"Trust in the Lord with all your heart and lean not on your own understanding."',
    ref: 'Proverbs 3:5',
    title: 'Grow in the Word',
    sub: 'Daily verses, reading plans,\nhighlights & notes',
  },
  {
    id: '3',
    verse: '"And let us consider how we may spur one another on toward love and good deeds."',
    ref: 'Hebrews 10:24',
    title: 'Stay Connected',
    sub: 'Prayer wall, group chats,\nevents & live worship',
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation<AuthStackNavigationProp>();
  const { setIsGuest } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

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
        colors={[BaseColors.brown900, BaseColors.brown800]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative glow */}
      <View style={styles.glow} />

      <SafeAreaView style={styles.safe}>
        {/* Logo + app name */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Gather</Text>
          <Text style={styles.churchName}>{CHURCH.name}</Text>
          <Text style={styles.location}>{CHURCH.fullLocation}</Text>
        </View>

        {/* Slides */}
        <Animated.FlatList
          ref={flatListRef}
          data={slides}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
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
              {index === 0 && (
                <LottieView
                  source={require('../../../assets/animations/welcome.json')}
                  autoPlay
                  loop
                  style={{ width: 180, height: 180, alignSelf: 'center', marginBottom: 12 }}
                />
              )}
              <View style={styles.verseCard}>
                <Text style={styles.verseEye}>✦ Scripture</Text>
                <Text style={styles.verseText}>{item.verse}</Text>
                <Text style={styles.verseRef}>— {item.ref}</Text>
              </View>
              <Text style={styles.slideTitle}>{item.title}</Text>
              <Text style={styles.slideSub}>{item.sub}</Text>
            </View>
          )}
        />

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
                style={[styles.dot, { width: dotWidth, opacity, backgroundColor: BaseColors.gold }]}
              />
            );
          })}
        </View>

        {/* CTA Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>
              {currentIndex < slides.length - 1 ? 'Next →' : 'Get started'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryBtnText}>I already have an account</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.guestBtn}
            onPress={() => setIsGuest(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.guestBtnText}>Browse as guest</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BaseColors.brown900 },
  safe: { flex: 1 },
  glow: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(26,86,219,0.12)',
  },
  header: { alignItems: 'center', paddingTop: Spacing['2xl'], paddingBottom: Spacing.lg },
  logo: { width: 80, height: 80, marginBottom: Spacing.sm },
  appName: {
    fontFamily: Typography.serif,
    fontSize: Typography.sizes['4xl'],
    color: BaseColors.white,
    letterSpacing: -0.5,
  },
  churchName: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.md,
    color: BaseColors.gold,
    marginTop: 2,
  },
  location: {
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.sm,
    color: BaseColors.brown300,
    marginTop: 2,
  },
  slide: {
    width,
    paddingHorizontal: Spacing['2xl'],
    alignItems: 'center',
  },
  verseCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: Spacing.xl,
    width: '100%',
  },
  verseEye: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.xs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: BaseColors.gold,
    marginBottom: Spacing.sm,
  },
  verseText: {
    fontFamily: Typography.serifItalic,
    fontSize: Typography.sizes.md,
    color: BaseColors.white,
    lineHeight: 26,
    marginBottom: Spacing.sm,
  },
  verseRef: {
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.sm,
    color: BaseColors.brown300,
  },
  slideTitle: {
    fontFamily: Typography.serif,
    fontSize: Typography.sizes['3xl'],
    color: BaseColors.white,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  slideSub: {
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.base,
    color: BaseColors.brown300,
    textAlign: 'center',
    lineHeight: 22,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginVertical: Spacing.xl,
  },
  dot: { height: 6, borderRadius: 3 },
  buttons: { paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing.xl, gap: Spacing.md },
  primaryBtn: {
    backgroundColor: BaseColors.gold,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.md,
    color: BaseColors.white,
  },
  secondaryBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  secondaryBtnText: {
    fontFamily: Typography.sansMedium,
    fontSize: Typography.sizes.base,
    color: BaseColors.brown300,
  },
  guestBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  guestBtnText: {
    fontFamily: Typography.sansMedium,
    fontSize: Typography.sizes.sm,
    color: BaseColors.brown400,
  },
});
