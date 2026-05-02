// src/screens/auth/LoginScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Modal,
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
import { BaseColors, Typography, Spacing, Radius, CHURCH } from '../../constants/theme';
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

  const [forgotVisible, setForgotVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleForgotPassword = async () => {
    const trimmed = resetEmail.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setAuthError('Enter a valid email address to reset your password.');
      return;
    }

    const configMessage = getSupabaseConfigMessage();
    if (configMessage) {
      setAuthError(configMessage);
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed);
      if (error) {
        const message = getSupabaseAuthErrorMessage(error.message);
        setAuthError(message);
        showToast({ title: 'Reset failed', message, variant: 'error' });
      } else {
        setAuthError(null);
        setResetSent(true);
      }
    } catch (err) {
      console.error('Password reset error:', err);
      const message = 'An unexpected error occurred. Please try again.';
      setAuthError(message);
      showToast({ title: 'Reset failed', message, variant: 'error' });
    } finally {
      setResetLoading(false);
    }
  };

  const closeForgotModal = () => {
    setForgotVisible(false);
    setResetEmail('');
    setResetSent(false);
  };

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
      console.error('Login error:', err);
      const message = 'An unexpected error occurred. Please try again.';
      setAuthError(message);
      showToast({ title: 'Login failed', message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) {
      setAuthError(error);
      showToast({ title: 'Google sign-in failed', message: error, variant: 'error' });
    }
    else setIsOnboarded(true);
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
        colors={[BaseColors.brown900, BaseColors.brown800]}
        style={StyleSheet.absoluteFillObject}
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
              <Text style={styles.title}>Welcome back 👋</Text>
              <Text style={styles.subtitle}>{CHURCH.name}</Text>
            </View>

            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color={BaseColors.brown900} />
              ) : (
                <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {appleAvailable && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={Radius.md}
                style={[styles.appleBtn, appleLoading && styles.socialBtnDisabled]}
                onPress={handleAppleSignIn}
              />
            )}

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or sign in with email</Text>
              <View style={styles.divider} />
            </View>

            {authError ? (
              <View style={styles.authErrorBanner}>
                <Ionicons name="alert-circle" size={12} color={BaseColors.red600} />
                <Text style={styles.authErrorText}>{authError}</Text>
              </View>
            ) : null}

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                placeholder="your@email.com"
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
                  placeholder="Your password"
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
                  <Ionicons name={showPass ? 'eye-off' : 'eye'} size={18} color={BaseColors.brown300} />
                </TouchableOpacity>
              </View>
              {renderInputError(errors.password)}
            </View>

            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => { setResetEmail(email); setForgotVisible(true); }}
              accessibilityRole="button"
              accessibilityLabel="Forgot password"
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <Modal
              visible={forgotVisible}
              transparent
              animationType="fade"
              onRequestClose={closeForgotModal}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Reset password</Text>
                    <TouchableOpacity
                      onPress={closeForgotModal}
                      style={styles.modalCloseBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Close reset password"
                    >
                      <Ionicons name="close" size={20} color={BaseColors.brown300} />
                    </TouchableOpacity>
                  </View>

                  {resetSent ? (
                    <View style={styles.resetSentWrap}>
                      <Ionicons name="mail-open-outline" size={40} color={BaseColors.gold} style={{ marginBottom: Spacing.md }} />
                      <Text style={styles.resetSentTitle}>Check your inbox</Text>
                      <Text style={styles.resetSentSub}>We sent a password reset link to{' '}
                        <Text style={styles.resetSentEmail}>{resetEmail.trim().toLowerCase()}</Text>
                      </Text>
                      <TouchableOpacity style={styles.resetDoneBtn} onPress={closeForgotModal}>
                        <Text style={styles.resetDoneBtnText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.modalSubtitle}>
                        Enter your account email and we&apos;ll send you a reset link.
                      </Text>
                      <TextInput
                        style={styles.modalInput}
                        value={resetEmail}
                        onChangeText={setResetEmail}
                        placeholder="your@email.com"
                        placeholderTextColor={BaseColors.brown400}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoFocus
                        selectionColor={BaseColors.gold}
                      />
                      <TouchableOpacity
                        style={[styles.modalSubmitBtn, resetLoading && { opacity: 0.7 }]}
                        onPress={handleForgotPassword}
                        disabled={resetLoading}
                      >
                        {resetLoading
                          ? <ActivityIndicator color={BaseColors.white} />
                          : <Text style={styles.modalSubmitText}>Send reset link</Text>}
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </Modal>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              {loading ? (
                <ActivityIndicator color={BaseColors.white} />
              ) : (
                <Text style={styles.submitText}>Sign in</Text>
              )}
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
  scroll: { padding: Spacing['2xl'], paddingTop: Spacing.lg },
  backBtn: {
    width: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  header: { marginBottom: Spacing.xl },
  title: { fontFamily: Typography.serif, fontSize: Typography.sizes['3xl'], color: BaseColors.white, marginBottom: 4 },
  subtitle: { fontFamily: Typography.sans, fontSize: Typography.sizes.base, color: BaseColors.brown300 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.md,
    paddingVertical: 12, marginBottom: Spacing.md, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  googleIcon: { fontFamily: Typography.sansSemiBold, fontSize: 18, color: BaseColors.white },
  googleText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.base, color: BaseColors.white },
  appleBtn: { width: '100%', height: 48, marginBottom: Spacing.xl },
  socialBtnDisabled: { opacity: 0.7 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xl },
  divider: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { fontFamily: Typography.sans, fontSize: Typography.sizes.sm, color: BaseColors.brown300 },
  authErrorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: BaseColors.red50,
    borderWidth: 1,
    borderColor: BaseColors.red100,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  authErrorText: {
    flex: 1,
    fontFamily: Typography.sansMedium,
    fontSize: Typography.sizes.sm,
    color: BaseColors.red700,
    lineHeight: 18,
  },
  inputWrap: { marginBottom: Spacing.lg },
  label: {
    fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.xs,
    letterSpacing: 0.8, textTransform: 'uppercase', color: BaseColors.brown300, marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 11,
    fontFamily: Typography.sans, fontSize: Typography.sizes.base, color: BaseColors.white,
  },
  inputError: { borderColor: BaseColors.red500 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  errorText: { fontFamily: Typography.sans, fontSize: 11, color: BaseColors.red500 },
  passWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.sm, paddingHorizontal: Spacing.md,
  },
  eyeBtn: { padding: Spacing.sm },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: Spacing.xl },
  forgotText: { fontFamily: Typography.sansMedium, fontSize: Typography.sizes.sm, color: BaseColors.gold },
  submitBtn: {
    backgroundColor: BaseColors.gold, borderRadius: Radius.md,
    paddingVertical: 15, alignItems: 'center', marginBottom: Spacing.xl,
  },
  submitText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.md, color: BaseColors.white },
  registerLink: { alignItems: 'center' },
  registerText: { fontFamily: Typography.sans, fontSize: Typography.sizes.base, color: BaseColors.brown300 },
  registerHighlight: { fontFamily: Typography.sansSemiBold, color: BaseColors.gold },
  // Forgot password modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: Spacing['2xl'] },
  modalCard: { width: '100%', backgroundColor: BaseColors.brown900, borderRadius: Radius.lg, padding: Spacing.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  modalTitle: { fontFamily: Typography.serif, fontSize: Typography.sizes.xl, color: BaseColors.white },
  modalCloseBtn: { padding: 4 },
  modalSubtitle: { fontFamily: Typography.sans, fontSize: Typography.sizes.sm, color: BaseColors.brown300, marginBottom: Spacing.lg, lineHeight: 20 },
  modalInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: 11, fontFamily: Typography.sans, fontSize: Typography.sizes.base, color: BaseColors.white, marginBottom: Spacing.lg },
  modalSubmitBtn: { backgroundColor: BaseColors.gold, borderRadius: Radius.md, paddingVertical: 13, alignItems: 'center' },
  modalSubmitText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.base, color: BaseColors.white },
  resetSentWrap: { alignItems: 'center', paddingVertical: Spacing.lg },
  resetSentTitle: { fontFamily: Typography.serif, fontSize: Typography.sizes.xl, color: BaseColors.white, marginBottom: Spacing.sm },
  resetSentSub: { fontFamily: Typography.sans, fontSize: Typography.sizes.sm, color: BaseColors.brown300, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xl },
  resetSentEmail: { color: BaseColors.white, fontFamily: Typography.sansSemiBold },
  resetDoneBtn: { backgroundColor: BaseColors.gold, borderRadius: Radius.md, paddingVertical: 13, paddingHorizontal: Spacing['2xl'], alignItems: 'center' },
  resetDoneBtnText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.base, color: BaseColors.white },
});
