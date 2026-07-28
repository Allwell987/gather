import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated, Dimensions, StatusBar, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';
import { BaseColors, Spacing, Radius, CHURCH } from '../../constants/theme';
import type { AuthStackNavigationProp } from '../../types/navigation';

const { width, height } = Dimensions.get('window');

const GridBackground = () => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <View style={styles.gridContainer}>
      {[...Array(20)].map((_, i) => (
        <View key={`v-${i}`} style={[styles.gridLine, { left: `${(i + 1) * 5}%`, width: 1, height: '100%' }]} />
      ))}
      {[...Array(40)].map((_, i) => (
        <View key={`h-${i}`} style={[styles.gridLine, { top: `${(i + 1) * 2.5}%`, height: 1, width: '100%' }]} />
      ))}
    </View>
  </View>
);

export default function LandingScreen() {
  const navigation = useNavigation<AuthStackNavigationProp>();
  const { colors, typography } = useThemeStore();
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(30));
  const [glowAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const entranceAnimations = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]);

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );

    entranceAnimations.start();
    pulseAnimation.start();

    return () => {
      entranceAnimations.stop();
      pulseAnimation.stop();
    };
  }, [fadeAnim, slideAnim, glowAnim]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0a0f1d', '#12192b', '#0a0f1d']}
        style={StyleSheet.absoluteFill}
      />

      <GridBackground />

      {/* Modernized Techy Ornaments */}
      <Animated.View style={[styles.topOrnament, {
        opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.3] }),
        transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }]
      }]} />
      <Animated.View style={[styles.bottomOrnament, {
        opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.2] }),
        transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }]
      }]} />

      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View
            style={[
              styles.content,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.logoWrapper}>
              <View style={styles.logoGlow} />
              <Image
                source={require('../../../assets/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={[styles.brandName, { fontFamily: typography.serif }]} numberOfLines={1} adjustsFontSizeToFit>GATHER</Text>

            <View style={styles.dividerContainer}>
              <View style={[styles.line, { backgroundColor: colors.accent }]} />
              <View style={[styles.diamond, { backgroundColor: colors.accent }]} />
              <View style={[styles.line, { backgroundColor: colors.accent }]} />
            </View>

            <Text style={[styles.churchTitle, { color: colors.accent, fontFamily: typography.sansSemiBold }]}>{CHURCH.name.toUpperCase()}</Text>
            <Text style={[styles.tagline, { color: colors.textSecondary, fontFamily: typography.serifItalic }]}>A Digital Kingdom Community</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.footer,
              { opacity: fadeAnim }
            ]}
          >
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('Onboarding')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.accent, colors.accentDeep || colors.accent]}
                style={styles.btnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[styles.btnText, { fontFamily: typography.sansSemiBold }]}>INITIALIZE EXPERIENCE</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={[styles.loginText, { color: colors.textSecondary, fontFamily: typography.sans }]}>
                Already a member? <Text style={[styles.loginHighlight, { color: colors.accent, fontFamily: typography.sansSemiBold }]}>Access Terminal</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1d' },
  gridContainer: { flex: 1, opacity: 0.05 },
  gridLine: { position: 'absolute', backgroundColor: BaseColors.white },
  safe: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingVertical: Spacing['4xl'],
  },
  content: { alignItems: 'center', marginTop: height * 0.05, paddingHorizontal: Spacing.xl },
  logoWrapper: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
  },
  logo: { width: 90, height: 90 },
  brandName: {
    fontSize: 48,
    color: BaseColors.white,
    letterSpacing: 10,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
    width: '70%',
  },
  line: {
    flex: 1,
    height: 1,
    opacity: 0.3,
  },
  diamond: {
    width: 8,
    height: 8,
    transform: [{ rotate: '45deg' }],
    marginHorizontal: Spacing.md,
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  churchTitle: {
    fontSize: 12,
    letterSpacing: 4,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    opacity: 0.9,
  },
  tagline: {
    fontSize: 16,
    marginTop: Spacing.md,
    opacity: 0.7,
  },
  footer: { paddingHorizontal: Spacing['3xl'], gap: Spacing.xl },
  primaryBtn: {
    borderRadius: Radius.sm,
    overflow: 'hidden',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  btnGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 14,
    color: BaseColors.white,
    letterSpacing: 2,
  },
  loginLink: { alignItems: 'center' },
  loginText: {
    fontSize: 13,
  },
  loginHighlight: {
    textDecorationLine: 'underline',
  },
  topOrnament: {
    position: 'absolute',
    top: -100,
    left: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
  },
  bottomOrnament: {
    position: 'absolute',
    bottom: -150,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(201, 146, 42, 0.1)',
  },
});
