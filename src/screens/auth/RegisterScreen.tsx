// src/screens/auth/RegisterScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import HeaderBar from '../../components/common/HeaderBar';
import {
  getAuthRedirectUrl,
  getSupabaseAuthErrorMessage,
  getSupabaseConfigMessage,
  isExpoGo,
  supabase,
} from '../../services/supabase';
import { signInWithApple, signInWithGoogle } from '../../services/auth';
import { BaseColors, Typography, Spacing, Radius } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { t, getDeviceLocale } from '../../services/locale';
import type { AuthStackNavigationProp } from '../../types/navigation';

interface FormErrors {
  firstName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterScreen() {
  const navigation = useNavigation<AuthStackNavigationProp>();
  const locale = getDeviceLocale();
  const { setPendingVerificationEmail, setAuthFeedback, setIsOnboarded } = useAuthStore();
  const { showToast } = useToastStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
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

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!firstName.trim()) newErrors.firstName = t('firstName', locale) + ' is required';
    if (!email.trim()) {
      newErrors.email = t('emailRequired', locale);
    } else if (!emailRegex.test(email.trim().toLowerCase())) {
      newErrors.email = t('validEmailRequired', locale);
    }

    if (!password) {
      newErrors.password = t('passwordRequired', locale);
    } else if (password.length < 8) {
      newErrors.password = t('password', locale) + ' must be at least 8 characters';
    }

    if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setAuthError(null);

    const configMessage = getSupabaseConfigMessage();
    if (configMessage) {
      setAuthError(configMessage);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);

    try {
      setPendingVerificationEmail(normalizedEmail);
      setAuthFeedback(null);

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { full_name: `${firstName} ${lastName}`.trim() },
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });

      if (error) {
        setPendingVerificationEmail(null);
        const message = getSupabaseAuthErrorMessage(error.message);
        setAuthError(message);
        showToast({ title: 'Sign up failed', message, variant: 'error' });
        setLoading(false);
        return;
      }

      const requiresEmailVerification = !data.session && !data.user?.email_confirmed_at;

      if (requiresEmailVerification) {
        setLoading(false);
        navigation.navigate('EmailVerification', { email: normalizedEmail });

        if (isExpoGo) {
          showToast({
            title: 'Note',
            message: 'Email links are less reliable in Expo Go. Use a dev build if possible.',
            variant: 'info'
          });
        }
        return;
      }

      if (data.session) {
        setPendingVerificationEmail(null);
        setIsOnboarded(true);
      }
    } catch (err) {
      if (__DEV__) {
        console.error('Registration error:', err);
      }
      setPendingVerificationEmail(null);
      setLoading(false);
      const message = 'An unexpected error occurred. Please try again.';
      setAuthError(message);
      showToast({ title: 'Error', message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

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
    } else {
      setIsOnboarded(true);
    }
  };

  const renderInputError = (error?: string) => {
    if (!error) return null;
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={12} color={BaseColors.red500} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a140e', '#2d1e12', '#17120d']}
        style={StyleSheet.absoluteFill}
      />
      <HeaderBar
        title={t('createAccount', locale)}
        onBackPress={() => navigation.goBack()}
        backgroundColor="transparent"
        enableBlur={true}
        blurTint="dark"
      />
      <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
          >
            <View style={styles.header}>
              <Text style={styles.stepLabel}>{t('stepXofY', locale).replace('{x}', '1').replace('{y}', '2')}</Text>
              <Text style={styles.title}>{t('createAccount', locale)}</Text>
              <Text style={styles.subtitle}>Begin your journey with the Wealth Reality Church</Text>
            </View>

            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color={BaseColors.gold} />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={18} color={BaseColors.white} />
                    <Text style={styles.googleText}>Google</Text>
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
                      <Ionicons name="logo-apple" size={20} color={BaseColors.white} />
                      <Text style={styles.appleText}>Apple</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>{t('orContinueWithEmail', locale)}</Text>
              <View style={styles.divider} />
            </View>

            {authError ? (
              <View style={styles.authErrorBanner}>
                <Ionicons name="alert-circle" size={16} color={BaseColors.red600} />
                <Text style={styles.authErrorText}>{authError}</Text>
              </View>
            ) : null}

            <View style={styles.nameRow}>
              <View style={[styles.inputWrap, { flex: 1 }]}>
                <Text style={styles.label}>{t('firstName', locale)}</Text>
                <TextInput
                  style={[styles.input, errors.firstName ? styles.inputError : null]}
                  value={firstName}
                  onChangeText={(t) => {
                    setFirstName(t);
                    if (errors.firstName) setErrors({ ...errors, firstName: undefined });
                  }}
                  placeholder="e.g. Grace"
                  placeholderTextColor={BaseColors.brown400}
                  selectionColor={BaseColors.gold}
                />
                {renderInputError(errors.firstName)}
              </View>
              <View style={[styles.inputWrap, { flex: 1 }]}>
                <Text style={styles.label}>{t('lastName', locale)}</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="e.g. Okafor"
                  placeholderTextColor={BaseColors.brown400}
                  selectionColor={BaseColors.gold}
                />
              </View>
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>{t('emailAddress', locale)}</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                placeholder={t('emailPlaceholder', locale)}
                placeholderTextColor={BaseColors.brown400}
                keyboardType="email-address"
                autoCapitalize="none"
                selectionColor={BaseColors.gold}
              />
              {renderInputError(errors.email)}
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>{t('password', locale)}</Text>
              <View style={[styles.passWrap, errors.password ? styles.inputError : null]}>
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0, paddingHorizontal: 0 }]}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  placeholder="Choose a strong password"
                  placeholderTextColor={BaseColors.brown400}
                  secureTextEntry={!showPass}
                  selectionColor={BaseColors.gold}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  <Ionicons name={showPass ? 'eye-off' : 'eye'} size={18} color={BaseColors.gold} />
                </TouchableOpacity>
              </View>
              {renderInputError(errors.password)}
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>{t('confirmPassword', locale)}</Text>
              <View style={[styles.passWrap, errors.confirmPassword ? styles.inputError : null]}>
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0, paddingHorizontal: 0 }]}
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                  }}
                  placeholder="Repeat password"
                  placeholderTextColor={BaseColors.brown400}
                  secureTextEntry={!showPass}
                  selectionColor={BaseColors.gold}
                />
              </View>
              {renderInputError(errors.confirmPassword)}
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[BaseColors.gold, BaseColors.goldDeep]}
                style={styles.submitGradient}
              >
                {loading ? (
                  <ActivityIndicator color={BaseColors.white} />
                ) : (
                  <Text style={styles.submitText}>{t('createAccount', locale).toUpperCase()}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.signInLink}>
              <Text style={styles.signInText}>
                {t('alreadyMember', locale)}{'  '}<Text style={styles.signInHighlight}>{t('signInBtn', locale)}</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, padding: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing['2xl'] },
  header: { marginBottom: Spacing.xl, alignItems: 'center' },
  stepLabel: {
    fontFamily: Typography.sansSemiBold, fontSize: 10,
    letterSpacing: 2, textTransform: 'uppercase', color: BaseColors.gold, marginBottom: 8,
  },
  title: {
    fontFamily: Typography.serif, fontSize: 32,
    color: BaseColors.white, marginBottom: 4,
  },
  subtitle: {
    fontFamily: Typography.sans, fontSize: 14,
    color: BaseColors.brown300, textAlign: 'center',
    lineHeight: 20, paddingHorizontal: 20
  },
  socialButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl
  },
  googleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.md,
    paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.05)',
  },
  googleText: { fontFamily: Typography.sansSemiBold, fontSize: 14, color: BaseColors.white },
  appleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.md,
    paddingVertical: 12, backgroundColor: BaseColors.black,
  },
  appleText: { fontFamily: Typography.sansSemiBold, fontSize: 14, color: BaseColors.white },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xl },
  divider: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  dividerText: { fontFamily: Typography.sans, fontSize: 12, color: BaseColors.brown400, letterSpacing: 0.5 },
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
  nameRow: { flexDirection: 'row', gap: Spacing.md },
  inputWrap: { marginBottom: Spacing.lg },
  label: {
    fontFamily: Typography.sansSemiBold, fontSize: 11,
    letterSpacing: 1, textTransform: 'uppercase', color: BaseColors.brown300, marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', borderRadius: Radius.md,
    paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: Typography.sans, fontSize: 16, color: BaseColors.white,
  },
  inputError: { borderColor: BaseColors.red700 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  errorText: { fontFamily: Typography.sans, fontSize: 11, color: BaseColors.red500 },
  passWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: Radius.md, paddingHorizontal: 16,
  },
  eyeBtn: { padding: Spacing.sm },
  submitBtn: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
    shadowColor: BaseColors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  submitText: {
    fontFamily: Typography.sansSemiBold, fontSize: 15,
    color: BaseColors.white, letterSpacing: 2
  },
  signInLink: { alignItems: 'center', marginTop: 'auto', paddingVertical: Spacing.lg },
  signInText: { fontFamily: Typography.sans, fontSize: 14, color: BaseColors.brown300 },
  signInHighlight: { fontFamily: Typography.sansSemiBold, color: BaseColors.gold },
});
