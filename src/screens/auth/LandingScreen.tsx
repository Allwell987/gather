import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated, Dimensions, StatusBar, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BaseColors, Typography, Spacing, Radius, CHURCH } from '../../constants/theme';
import type { AuthStackNavigationProp } from '../../types/navigation';

const { height } = Dimensions.get('window');

export default function LandingScreen() {
  const navigation = useNavigation<AuthStackNavigationProp>();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1a140e', '#2d1e12', '#17120d']}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Royal Accents */}
      <View style={styles.topOrnament} />
      <View style={styles.bottomOrnament} />

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
              <Image
                source={require('../../../assets/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.brandName} numberOfLines={1} adjustsFontSizeToFit>GATHER</Text>

            <View style={styles.dividerContainer}>
              <View style={styles.line} />
              <View style={styles.diamond} />
              <View style={styles.line} />
            </View>

            <Text style={styles.churchTitle}>{CHURCH.name.toUpperCase()}</Text>
            <Text style={styles.tagline}>A Kingdom Community</Text>
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
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[BaseColors.gold, BaseColors.goldDeep]}
                style={styles.btnGradient}
              >
                <Text style={styles.btnText}>ENTER GATHER</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginText}>Already a member? <Text style={styles.loginHighlight}>Sign In</Text></Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#17120d' },
  safe: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingVertical: Spacing['4xl'],
  },
  content: { alignItems: 'center', marginTop: height * 0.05, paddingHorizontal: Spacing.xl },
  logoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201, 146, 42, 0.3)',
    marginBottom: Spacing['2xl'],
    shadowColor: BaseColors.gold,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  logo: { width: 80, height: 80 },
  brandName: {
    fontFamily: Typography.serif,
    fontSize: 42,
    color: BaseColors.white,
    letterSpacing: 8,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
    width: '60%',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: BaseColors.gold,
    opacity: 0.4,
  },
  diamond: {
    width: 6,
    height: 6,
    backgroundColor: BaseColors.gold,
    transform: [{ rotate: '45deg' }],
    marginHorizontal: Spacing.md,
  },
  churchTitle: {
    fontFamily: Typography.sansSemiBold,
    fontSize: 14,
    color: BaseColors.gold,
    letterSpacing: 3,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  tagline: {
    fontFamily: Typography.serifItalic,
    fontSize: 18,
    color: BaseColors.brown300,
    marginTop: Spacing.md,
    opacity: 0.8,
  },
  footer: { paddingHorizontal: Spacing['3xl'], gap: Spacing.xl },
  primaryBtn: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    shadowColor: BaseColors.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  btnGradient: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: 16,
    color: BaseColors.white,
    letterSpacing: 3,
  },
  loginLink: { alignItems: 'center' },
  loginText: {
    fontFamily: Typography.sans,
    fontSize: 14,
    color: BaseColors.brown300,
  },
  loginHighlight: {
    color: BaseColors.gold,
    fontFamily: Typography.sansSemiBold,
  },
  topOrnament: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(201, 146, 42, 0.05)',
  },
  bottomOrnament: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(26, 86, 219, 0.03)',
  },
});
