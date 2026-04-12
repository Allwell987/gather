// src/screens/auth/EmailVerificationScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useToastStore } from '../../store/toastStore';
import {
  getAuthRedirectUrl,
  getSupabaseAuthErrorMessage,
  getSupabaseConfigMessage,
  isExpoGo,
  isSupabaseConfigured,
  supabase,
} from '../../services/supabase';
import { BaseColors, Typography, Spacing, Radius } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { ensureProfileForSession } from '../../services/profile';
import type { AuthStackNavigationProp, EmailVerificationRouteProp } from '../../types/navigation';

export default function EmailVerificationScreen() {
  const navigation = useNavigation<AuthStackNavigationProp>();
  const route = useRoute<EmailVerificationRouteProp>();
  const { showToast } = useToastStore();
  const {
    pendingVerificationEmail,
    setAuthFeedback,
    setPendingVerificationEmail,
    setUser,
    setSession,
    setIsOnboarded,
  } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const email = route.params?.email || pendingVerificationEmail || '';

  useEffect(() => {
    if (email) {
      setPendingVerificationEmail(email);
    }
  }, [email, setPendingVerificationEmail]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setAuthFeedback(null);
        setPendingVerificationEmail(null);
        navigation.navigate('ThemePicker', { fromOnboarding: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigation, setAuthFeedback, setPendingVerificationEmail]);

  const handleResendEmail = async () => {
    const configMessage = getSupabaseConfigMessage();
    if (configMessage) {
      Alert.alert('Supabase setup required', configMessage);
      return;
    }

    if (!email) {
      Alert.alert('Error', 'No email address found. Please try signing up again.');
      return;
    }

    setResendLoading(true);
    try {
      setAuthFeedback(null);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: { emailRedirectTo: getAuthRedirectUrl() },
      });

      if (error) {
        Alert.alert('Error', getSupabaseAuthErrorMessage(error.message));
      } else {
        showToast({ title: 'Email sent', message: 'Check your inbox for the link.', variant: 'success' });
      }
    } catch (err) {
      console.error('Resend error:', err);
    } finally {
      setResendLoading(false);
    }
  };

  const handleSkip = async () => {
    setAuthFeedback(null);
    setPendingVerificationEmail(null);

    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      try {
        const profile = await ensureProfileForSession(session);
        setUser(profile);
        setSession(session.access_token ?? null);
        setIsOnboarded(true);
      } catch (err) {
        console.error('Skip onboarding error:', err);
        // Fall through to ThemePicker so user can still continue
        navigation.navigate('ThemePicker', { fromOnboarding: true });
      }
    } else {
      // No active session yet — let them choose theme first, ThemePicker will recover session
      navigation.navigate('ThemePicker', { fromOnboarding: true });
    }
  };

  const handleContinue = () => {
    setLoading(true);
    supabase.auth.getUser()
      .then(({ data: { user } }) => {
        if (user?.email_confirmed_at) {
          setAuthFeedback(null);
          setPendingVerificationEmail(null);
          navigation.navigate('ThemePicker', { fromOnboarding: true });
        } else {
          Alert.alert('Not verified yet', 'Please click the link in your email first.');
        }
      })
      .finally(() => setLoading(false));
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[BaseColors.brown900, BaseColors.brown800]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={BaseColors.white} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail-unread" size={48} color={BaseColors.white} />
          </View>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            A verification link was sent to{'\n'}
            <Text style={styles.email}>{email}</Text>
          </Text>
        </View>

        <View style={styles.instructions}>
          {isExpoGo && (
            <View style={styles.noteCard}>
              <Ionicons name="information-circle" size={18} color={BaseColors.white} />
              <Text style={styles.noteText}>
                Expo Go urls are temporary. For best results, use a development build.
              </Text>
            </View>
          )}
          <Text style={styles.instructionText}>
            You can click the link in the email now, or skip this step and verify your account later from your Profile.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleContinue}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={BaseColors.brown900} /> : <Text style={styles.continueBtnText}>I&apos;ve verified my email</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={handleSkip}
          >
            <Text style={styles.skipBtnText}>Skip for now →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendBtn}
            onPress={handleResendEmail}
            disabled={resendLoading}
          >
            <Text style={styles.resendBtnText}>{resendLoading ? 'Sending...' : 'Resend verification email'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Wrong email?{' '}
            <Text style={styles.footerLink} onPress={() => navigation.navigate('Register')}>Sign up again</Text>
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.xl },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  header: { alignItems: 'center', marginTop: Spacing['2xl'], marginBottom: Spacing.xl },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  title: { fontFamily: Typography.serif, fontSize: Typography.sizes.xl, color: BaseColors.white, textAlign: 'center' },
  subtitle: { fontFamily: Typography.sans, fontSize: Typography.sizes.base, color: BaseColors.brown300, textAlign: 'center', marginTop: Spacing.sm },
  email: { color: BaseColors.white, fontFamily: Typography.sansSemiBold },
  instructions: { marginBottom: Spacing.xl },
  noteCard: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: Spacing.md },
  noteText: { flex: 1, fontFamily: Typography.sans, fontSize: Typography.sizes.xs, color: BaseColors.brown100, lineHeight: 18 },
  instructionText: { fontFamily: Typography.sans, fontSize: Typography.sizes.sm, color: BaseColors.brown200, textAlign: 'center', lineHeight: 20 },
  actions: { gap: Spacing.md, marginBottom: Spacing.xl },
  continueBtn: { backgroundColor: BaseColors.white, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center' },
  continueBtnText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.base, color: BaseColors.brown900 },
  skipBtn: { paddingVertical: 12, alignItems: 'center' },
  skipBtnText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.base, color: BaseColors.gold },
  resendBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  resendBtnText: { fontFamily: Typography.sans, fontSize: Typography.sizes.sm, color: BaseColors.brown300 },
  footer: { alignItems: 'center' },
  footerText: { fontFamily: Typography.sans, fontSize: Typography.sizes.sm, color: BaseColors.brown300 },
  footerLink: { color: BaseColors.gold, fontFamily: Typography.sansSemiBold },
});
