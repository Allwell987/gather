// src/screens/auth/LoginScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import HeaderBar from '../../components/common/HeaderBar';
import { signInWithApple, signInWithGoogle } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { BaseColors, Typography, Spacing, Radius } from '../../constants/theme';
import { t, getDeviceLocale } from '../../services/locale';
import type { AuthStackNavigationProp } from '../../types/navigation';

export default function LoginScreen() {
  const navigation = useNavigation<AuthStackNavigationProp>();
  const locale = getDeviceLocale();
  const { setIsOnboarded } = useAuthStore();
  const { showToast } = useToastStore();

  const [authError, setAuthError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setGoogleLoading(true);
    const { user, error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) {
      setAuthError(error);
      showToast({ title: 'Google sign-in failed', message: error, variant: 'error' });
    } else if (user) {
      setIsOnboarded(true);
    }
  };

  const handleAppleSignIn = async () => {
    setAuthError(null);
    setAppleLoading(true);
    const { error } = await signInWithApple();
    setAppleLoading(false);
    if (error) {
      setAuthError(error);
      showToast({ title: 'Apple sign-in failed', message: error, variant: 'error' });
    }
    else setIsOnboarded(true);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a140e', '#2d1e12', '#17120d']}
        style={StyleSheet.absoluteFill}
      />
      <HeaderBar
        title={t('signInBtn', locale)}
        onBackPress={() => navigation.goBack()}
        backgroundColor="transparent"
        enableBlur={true}
        blurTint="dark"
      />
      <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.safe}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('welcomeToGather', locale) || 'Welcome to Gather'}</Text>
            <Text style={styles.subtitle}>{t('signInWithSocial', locale) || 'Sign in to access your digital kingdom community'}</Text>
          </View>

          {authError ? (
            <View style={styles.authErrorBanner}>
              <Ionicons name="alert-circle" size={16} color={BaseColors.red600} />
              <Text style={styles.authErrorText}>{authError}</Text>
            </View>
          ) : null}

          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color={BaseColors.gold} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color={BaseColors.white} />
                  <Text style={styles.googleText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {appleAvailable && (
              <TouchableOpacity
                style={styles.appleBtn}
                onPress={handleAppleSignIn}
                disabled={appleLoading}
              >
                {appleLoading ? (
                  <ActivityIndicator size="small" color={BaseColors.white} />
                ) : (
                  <>
                    <Ionicons name="logo-apple" size={22} color={BaseColors.white} />
                    <Text style={styles.appleText}>Continue with Apple</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.footerInfo}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1, padding: Spacing.xl, justifyContent: 'center', paddingBottom: Spacing['4xl'] },
  header: { marginBottom: Spacing['3xl'], alignItems: 'center' },
  title: { fontFamily: Typography.serif, fontSize: 32, color: BaseColors.white, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontFamily: Typography.sans, fontSize: 16, color: BaseColors.brown300, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  socialButtonsContainer: {
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
    width: '100%'
  },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.md,
    paddingVertical: 16, backgroundColor: 'rgba(255,255,255,0.05)',
  },
  googleText: { fontFamily: Typography.sansSemiBold, fontSize: 16, color: BaseColors.white },
  appleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.md,
    paddingVertical: 16, backgroundColor: BaseColors.black,
  },
  appleText: { fontFamily: Typography.sansSemiBold, fontSize: 16, color: BaseColors.white },
  authErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.2)',
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: Spacing.lg,
  },
  authErrorText: {
    flex: 1,
    fontFamily: Typography.sansMedium,
    fontSize: 13,
    color: '#fca5a5',
    lineHeight: 18,
  },
  footerInfo: { marginTop: Spacing.xl, paddingHorizontal: 20 },
  footerText: {
    fontFamily: Typography.sans,
    fontSize: 12,
    color: BaseColors.brown400,
    textAlign: 'center',
    lineHeight: 18,
    opacity: 0.6
  }
});
