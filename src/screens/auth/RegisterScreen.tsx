// src/screens/auth/RegisterScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
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
import { BaseColors, Typography, Spacing, Radius, CHURCH } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import type { AuthStackNavigationProp } from '../../types/navigation';

interface FormErrors {
  firstName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterScreen() {
  const navigation = useNavigation<AuthStackNavigationProp>();
  const { setPendingVerificationEmail, setAuthFeedback, setIsOnboarded } = useAuthStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
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

    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(email.trim().toLowerCase())) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    const configMessage = getSupabaseConfigMessage();
    if (configMessage) {
      Alert.alert('Supabase setup required', configMessage);
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
        Alert.alert('Sign up failed', getSupabaseAuthErrorMessage(error.message));
        setLoading(false);
        return;
      }

      const requiresEmailVerification = !data.session && !data.user?.email_confirmed_at;

      if (requiresEmailVerification) {
        setLoading(false);
        navigation.navigate('EmailVerification', { email: normalizedEmail });

        if (isExpoGo) {
          Alert.alert(
            'Expo Go note',
            'Email verification links are not reliable in Expo Go. Use a development build for stable auth callbacks.'
          );
        }
        return;
      }

      if (data.session || data.user?.email_confirmed_at) {
        setPendingVerificationEmail(null);
        setLoading(false);
        // Onboarding flow or Home
      }
    } catch (err) {
      console.error('Registration error:', err);
      setPendingVerificationEmail(null);
      setLoading(false);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) Alert.alert('Google Sign-up Failed', error);
    else setIsOnboarded(true);
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    const { error } = await signInWithApple();
    setAppleLoading(false);
    if (error) Alert.alert('Apple Sign-up Failed', error);
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
        title="Create Account"
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
              <Text style={styles.stepLabel}>Step 1 of 2</Text>
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>Join the {CHURCH.name} community</Text>
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
              <Text style={styles.dividerText}>or sign up with email</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.nameRow}>
              <View style={[styles.inputWrap, { flex: 1 }]}>
                <Text style={styles.label}>First name *</Text>
                <TextInput
                  style={[styles.input, errors.firstName ? styles.inputError : null]}
                  value={firstName}
                  onChangeText={(t) => {
                    setFirstName(t);
                    if (errors.firstName) setErrors({ ...errors, firstName: undefined });
                  }}
                  placeholder="Grace"
                  placeholderTextColor={BaseColors.brown400}
                  selectionColor={BaseColors.gold}
                />
                {renderInputError(errors.firstName)}
              </View>
              <View style={[styles.inputWrap, { flex: 1 }]}>
                <Text style={styles.label}>Last name</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Okafor"
                  placeholderTextColor={BaseColors.brown400}
                  selectionColor={BaseColors.gold}
                />
              </View>
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                placeholder="grace@email.com"
                placeholderTextColor={BaseColors.brown400}
                keyboardType="email-address"
                autoCapitalize="none"
                selectionColor={BaseColors.gold}
              />
              {renderInputError(errors.email)}
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Password *</Text>
              <View style={[styles.passWrap, errors.password ? styles.inputError : null]}>
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0, paddingHorizontal: 0 }]}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  placeholder="Min. 8 characters"
                  placeholderTextColor={BaseColors.brown400}
                  secureTextEntry={!showPass}
                  selectionColor={BaseColors.gold}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  <Ionicons name={showPass ? 'eye-off' : 'eye'} size={18} color={BaseColors.brown300} />
                </TouchableOpacity>
              </View>
              {renderInputError(errors.password)}
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Confirm Password *</Text>
              <View style={[styles.passWrap, errors.confirmPassword ? styles.inputError : null]}>
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0, paddingHorizontal: 0 }]}
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                  }}
                  placeholder="Repeat your password"
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
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={BaseColors.white} />
              ) : (
                <Text style={styles.submitText}>Create account →</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.signInLink}>
              <Text style={styles.signInText}>
                Already a member?{'  '}<Text style={styles.signInHighlight}>Sign in</Text>
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
  stepLabel: {
    fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.xs,
    letterSpacing: 1.5, textTransform: 'uppercase', color: BaseColors.gold, marginBottom: 4,
  },
  title: {
    fontFamily: Typography.serif, fontSize: Typography.sizes['3xl'],
    color: BaseColors.white, marginBottom: Spacing.sm,
  },
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
  nameRow: { flexDirection: 'row', gap: Spacing.md },
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
  submitBtn: {
    backgroundColor: BaseColors.gold, borderRadius: Radius.md,
    paddingVertical: 15, alignItems: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xl,
  },
  submitText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.md, color: BaseColors.white },
  signInLink: { alignItems: 'center' },
  signInText: { fontFamily: Typography.sans, fontSize: Typography.sizes.base, color: BaseColors.brown300 },
  signInHighlight: { fontFamily: Typography.sansSemiBold, color: BaseColors.gold },
});
