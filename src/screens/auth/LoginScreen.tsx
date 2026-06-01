// src/screens/auth/LoginScreen.tsx
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
  getSupabaseAuthErrorMessage,
  getSupabaseConfigMessage,
  supabase,
} from '../../services/supabase';
import { signInWithApple, signInWithGoogle } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { BaseColors, Typography, Spacing, Radius } from '../../constants/theme';
import type { AuthStackNavigationProp } from '../../types/navigation';

interface FormErrors {
  email?: string;
  password?: string;
}

export default function LoginScreen() {
  const navigation = useNavigation<AuthStackNavigationProp>();
  const { setIsOnboarded } = useAuthStore();
  const { showToast } = useToastStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
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
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase())) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setAuthError(null);

    const configMessage = getSupabaseConfigMessage();
    if (configMessage) {
      setAuthError(configMessage);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (error) {
        const message = getSupabaseAuthErrorMessage(error.message);
        setAuthError(message);
        showToast({ title: 'Login failed', message, variant: 'error' });
        return;
      }

      if (data.user) {
        setIsOnboarded(true);
      }
    } catch (err) {
      if (__DEV__) {
        console.error('Login error:', err);
      }
      const message = 'An unexpected error occurred. Please try again.';
      setAuthError(message);
      showToast({ title: 'Login failed', message, variant: 'error' });
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
    setAppleLoading(true);
    const { error } = await signInWithApple();
    setAppleLoading(false);
    if (error) {
      setAuthError(error);
      showToast({ title: 'Apple sign-in failed', message: error, variant: 'error' });
    }
    else setIsOnboarded(true);
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
        title="Sign In"
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
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to your kingdom community</Text>
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
              <Text style={styles.dividerText}>or continue with email</Text>
              <View style={styles.divider} />
            </View>

            {authError ? (
              <View style={styles.authErrorBanner}>
                <Ionicons name="alert-circle" size={16} color={BaseColors.red600} />
                <Text style={styles.authErrorText}>{authError}</Text>
              </View>
            ) : null}

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                placeholder="youremail@domain.com"
                placeholderTextColor={BaseColors.brown400}
                keyboardType="email-address"
                autoCapitalize="none"
                selectionColor={BaseColors.gold}
              />
              {renderInputError(errors.email)}
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.passWrap, errors.password ? styles.inputError : null]}>
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0, paddingHorizontal: 0 }]}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  placeholder="Enter your password"
                  placeholderTextColor={BaseColors.brown400}
                  secureTextEntry={!showPass}
                  selectionColor={BaseColors.gold}
                />
                <TouchableOpacity
                  onPress={() => setShowPass(!showPass)}
                  style={styles.eyeBtn}
                  accessibilityRole="button"
                  accessibilityLabel={showPass ? 'Hide password' : 'Show password'}
                >
                  <Ionicons name={showPass ? 'eye-off' : 'eye'} size={18} color={BaseColors.gold} />
                </TouchableOpacity>
              </View>
              {renderInputError(errors.password)}
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleLogin}
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
                  <Text style={styles.submitText}>SIGN IN</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              style={styles.registerLink}
              accessibilityRole="button"
              accessibilityLabel="Create account"
            >
              <Text style={styles.registerText}>
                New to Gather?{'  '}<Text style={styles.registerHighlight}>Create account</Text>
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
  title: { fontFamily: Typography.serif, fontSize: 32, color: BaseColors.white, marginBottom: 4 },
  subtitle: { fontFamily: Typography.sans, fontSize: 14, color: BaseColors.brown300 },
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
  forgotBtn: { alignSelf: 'flex-end', marginBottom: Spacing.xl },
  forgotText: { fontFamily: Typography.sansMedium, fontSize: 13, color: BaseColors.gold },
  submitBtn: {
    borderRadius: Radius.md,
    overflow: 'hidden',
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
  registerLink: { alignItems: 'center', marginTop: 'auto', paddingVertical: Spacing.lg },
  registerText: { fontFamily: Typography.sans, fontSize: 14, color: BaseColors.brown300 },
  registerHighlight: { fontFamily: Typography.sansSemiBold, color: BaseColors.gold },
  // Modal styles remain similar but updated with theme colors
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: Spacing['2xl'] },
  modalCard: { width: '100%', backgroundColor: '#1a140e', borderRadius: Radius.lg, padding: Spacing.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  modalTitle: { fontFamily: Typography.serif, fontSize: 24, color: BaseColors.white },
  modalCloseBtn: { padding: 4 },
  modalSubtitle: { fontFamily: Typography.sans, fontSize: 14, color: BaseColors.brown300, marginBottom: Spacing.lg, lineHeight: 20 },
  modalInput: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 14, fontFamily: Typography.sans, fontSize: 16, color: BaseColors.white, marginBottom: Spacing.lg },
  modalSubmitBtn: { borderRadius: Radius.md, overflow: 'hidden' },
  modalSubmitGradient: { paddingVertical: 14, alignItems: 'center' },
  modalSubmitText: { fontFamily: Typography.sansSemiBold, fontSize: 14, color: BaseColors.white, letterSpacing: 1 },
  resetSentWrap: { alignItems: 'center', paddingVertical: Spacing.lg },
  resetSentTitle: { fontFamily: Typography.serif, fontSize: 24, color: BaseColors.white, marginBottom: Spacing.sm },
  resetSentSub: { fontFamily: Typography.sans, fontSize: 14, color: BaseColors.brown300, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  resetSentEmail: { color: BaseColors.white, fontFamily: Typography.sansSemiBold },
  resetDoneBtn: { borderRadius: Radius.md, overflow: 'hidden', paddingHorizontal: 40 },
  resetDoneBtnGradient: { paddingVertical: 14, alignItems: 'center' },
  resetDoneBtnText: { fontFamily: Typography.sansSemiBold, fontSize: 14, color: BaseColors.white },
});
