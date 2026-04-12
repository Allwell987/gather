// src/screens/profile/ProfileScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Button from '../../components/common/Button';
import TextInput from '../../components/common/TextInput';
import { useOfflineSyncStatus } from '../../hooks/useOfflineSyncStatus';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { useThemeStore } from '../../store/themeStore';
import {
  cancelDailyVerseNotifications,
  scheduleDailyVerseNotification,
} from '../../services/notifications';
import {
  getAvatarUploadErrorMessage,
  getEmailUpdateErrorMessage,
  updateAccountEmail,
  updateAccountPassword,
  updateProfile,
  uploadProfileAvatar,
} from '../../services/profile';
import { supabase } from '../../services/supabase';
import {
  BaseColors,
  AccentTheme,
  Typography,
  Spacing,
  Radius,
  CHURCH,
  DAILY_VERSE,
  ThemeMode,
} from '../../constants/theme';
import type { BibleVersion } from '../../types/database';
import type { ProfileScreenNavigationProp } from '../../types/navigation';

type EditorMode = 'profile' | 'preferences' | 'password' | 'email' | 'verification' | 'appearance' | null;

type SettingRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  iconBg?: string;
  iconColor?: string;
  danger?: boolean;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  colors: any;
};

const BIBLE_VERSION_OPTIONS: { value: BibleVersion; label: string }[] = [
  { value: 'niv', label: 'NIV' },
  { value: 'kjv', label: 'KJV' },
  { value: 'nkjv', label: 'NKJV' },
];

const REMINDER_TIME_OPTIONS = ['06:00', '07:00', '12:00', '19:00', '21:00'];
const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const formatBibleVersion = (value?: BibleVersion | null) => value?.toUpperCase() ?? 'NIV';

const formatReminderTime = (value?: string | null) => {
  if (!value || !TIME_24H_REGEX.test(value)) {
    return '7:00 AM';
  }

  const [hourString, minute] = value.split(':');
  const hour = Number(hourString);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  return `${hour12}:${minute} ${suffix}`;
};

const getInitials = (fullName?: string | null, email?: string | null) => {
  const words = fullName
    ?.trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (words && words.length > 0) {
    return words.map((word) => word[0]?.toUpperCase() ?? '').join('');
  }

  return email?.trim()?.charAt(0)?.toUpperCase() ?? 'G';
};

const getRoleLabel = (role?: string | null) => {
  switch (role) {
    case 'admin':
      return 'Church Admin';
    case 'pastor':
      return 'Pastor';
    case 'leader':
      return 'Ministry Leader';
    default:
      return 'Faithful Member';
  }
};

const getProfileValidationError = (fullName: string) => {
  if (fullName.trim().length < 2) {
    return 'Enter your full name so other members can recognize you.';
  }

  return null;
};

const getPasswordValidationError = (password: string, confirmPassword: string) => {
  if (password.length < 8) {
    return 'Use at least 8 characters for your new password.';
  }

  if (password !== confirmPassword) {
    return 'The password confirmation does not match.';
  }

  return null;
};

const getEmailValidationError = (email: string, currentEmail?: string | null) => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return 'Enter the new email you want to use for this account.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return 'Enter a valid email address.';
  }

  if (normalizedEmail === currentEmail?.trim().toLowerCase()) {
    return 'That is already your current email address.';
  }

  return null;
};

const formatSyncTimestamp = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `Last synced ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
};

function SettingRow({
  icon,
  label,
  value,
  onPress,
  iconBg,
  iconColor,
  danger = false,
  toggle = false,
  toggleValue = false,
  onToggle,
  colors,
}: SettingRowProps) {
  const defaultIconBg = colors.background === '#ffffff' ? '#f0f0f0' : colors.border;
  const defaultIconColor = colors.textSecondary;

  return (
    <TouchableOpacity
      style={[styles.settingRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={toggle ? 1 : 0.7}
      disabled={!onPress && !toggle}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconBg || defaultIconBg }]}>
        <Ionicons name={icon} size={16} color={danger ? BaseColors.red500 : (iconColor || defaultIconColor)} />
      </View>
      <Text style={[styles.settingLabel, { color: colors.text }, danger && { color: BaseColors.red500 }]}>{label}</Text>
      {toggle ? (
        <AnimatedToggle
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: iconColor || colors.text }}
        />
      ) : value ? (
        <>
          <Text style={[styles.settingValue, { color: colors.textMuted }]}>{value}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </>
      ) : !danger ? (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      ) : null}
    </TouchableOpacity>
  );
}

// Animated toggle switch microinteraction
function AnimatedToggle({ value, onValueChange, trackColor }: { value: boolean; onValueChange?: (v: boolean) => void; trackColor: { false: string; true: string } }) {
  const offset = useSharedValue(value ? 18 : 2);
  const bg = value ? trackColor.true : trackColor.false;
  React.useEffect(() => {
    offset.value = withTiming(value ? 18 : 2, { duration: 220 });
  }, [value]);
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));
  return (
    <TouchableOpacity
      onPress={() => onValueChange?.(!value)}
      activeOpacity={0.8}
      style={{ width: 40, height: 24, borderRadius: 12, backgroundColor: bg, justifyContent: 'center', padding: 2 }}
    >
      <Animated.View style={[{ width: 20, height: 20, borderRadius: 10, backgroundColor: BaseColors.white, elevation: 2 }, thumbStyle]} />
    </TouchableOpacity>
  );
}

// ── Guest profile prompt ──────────────────────────────────────────────────────
function GuestProfilePrompt({
  theme,
  colors,
  onRegister,
  onLogin,
}: {
  theme: AccentTheme;
  colors: any;
  onRegister: () => void;
  onLogin: () => void;
}) {
  return (
    <View style={[guestStyles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: BaseColors.brown900 }}>
        <View style={guestStyles.hero}>
          <View style={[guestStyles.heroBg, { backgroundColor: theme.accentSubtle }]} />
          <Text style={guestStyles.heroTitle}>My Profile</Text>
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={guestStyles.body} showsVerticalScrollIndicator={false}>
        <View style={[guestStyles.iconCircle, { backgroundColor: colors.border }]}>
          <Ionicons name="person-outline" size={40} color={colors.textSecondary} />
        </View>
        <Text style={[guestStyles.title, { color: colors.text }]}>Complete your profile</Text>
        <Text style={[guestStyles.subtitle, { color: colors.textSecondary }]}>
          Create a free account to save your preferences, join the prayer wall, RSVP to events and more.
        </Text>

        {/* Steps */}
        <View style={[guestStyles.steps, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { num: '1', label: 'Verify your email', icon: 'mail-outline' as const, active: true },
            { num: '2', label: 'Choose your theme', icon: 'color-palette-outline' as const, active: false },
            { num: '3', label: 'You\'re in!', icon: 'checkmark-circle-outline' as const, active: false },
          ].map((step) => (
            <View key={step.num} style={guestStyles.stepRow}>
              <View style={[guestStyles.stepDot, { backgroundColor: colors.border }, step.active && { backgroundColor: theme.accent }]}>
                <Ionicons name={step.icon} size={14} color={step.active ? BaseColors.white : colors.textMuted} />
              </View>
              <Text style={[guestStyles.stepLabel, { color: colors.textSecondary }, step.active && { color: colors.text, fontFamily: Typography.sansSemiBold }]}>
                {step.label}
              </Text>
              {step.active && (
                <View style={[guestStyles.stepBadge, { backgroundColor: theme.accentLight }]}>
                  <Text style={[guestStyles.stepBadgeText, { color: theme.accent }]}>Start here</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[guestStyles.primaryBtn, { backgroundColor: theme.accent }]}
          onPress={onRegister}
          activeOpacity={0.85}
        >
          <Text style={guestStyles.primaryBtnText}>Create account →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={guestStyles.secondaryBtn} onPress={onLogin} activeOpacity={0.7}>
          <Text style={[guestStyles.secondaryBtnText, { color: colors.textSecondary }]}>I already have an account</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const guestStyles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    backgroundColor: BaseColors.brown900,
    padding: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    position: 'relative',
    overflow: 'hidden',
  },
  heroBg: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
  },
  heroTitle: { fontFamily: Typography.serif, fontSize: Typography.sizes.xl, color: BaseColors.white },
  body: { alignItems: 'center', padding: Spacing['2xl'], paddingTop: Spacing['3xl'] },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontFamily: Typography.serif,
    fontSize: Typography.sizes['2xl'],
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing['2xl'],
  },
  steps: {
    width: '100%',
    borderRadius: Radius.lg, padding: Spacing.lg,
    marginBottom: Spacing['2xl'], gap: Spacing.md,
    borderWidth: 1,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepDot: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  stepLabel: { flex: 1, fontFamily: Typography.sans, fontSize: Typography.sizes.base },
  stepBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  stepBadgeText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.xs },
  primaryBtn: {
    width: '100%', borderRadius: Radius.md, paddingVertical: 15,
    alignItems: 'center', marginBottom: Spacing.md,
  },
  primaryBtnText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.md, color: BaseColors.white },
  secondaryBtn: { paddingVertical: Spacing.sm, alignItems: 'center' },
  secondaryBtnText: { fontFamily: Typography.sansMedium, fontSize: Typography.sizes.base },
});

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user, setUser, signOut, setIsGuest } = useAuthStore();
  const { showToast } = useToastStore();
  const { theme, colors, themeMode, setThemeMode } = useThemeStore();

  const [notifPush, setNotifPush] = useState(true);
  const [notifVerse, setNotifVerse] = useState(true);
  const [notifGroups, setNotifGroups] = useState(true);
  const [notifEvents, setNotifEvents] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bibleVersion, setBibleVersion] = useState<BibleVersion>('niv');
  const [reminderTime, setReminderTime] = useState('06:00');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailDraft, setEmailDraft] = useState('');
  const [avatarPreviewUri, setAvatarPreviewUri] = useState<string | null>(null);
  const [pickedAvatarBase64, setPickedAvatarBase64] = useState<string | null>(null);
  const [pickedAvatarMimeType, setPickedAvatarMimeType] = useState<string | null>(null);
  const [hasPendingVerification, setHasPendingVerification] = useState(false);
  const [foundationCertificate, setFoundationCertificate] = useState<{ uri: string, name: string } | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const preferencesY = useRef(0);

  const {
    isOnline,
    syncSummary,
    lastSyncAt,
    isRetryingSync,
    refreshSyncStatus,
    retrySync,
  } = useOfflineSyncStatus(user?.id);

  const checkVerificationStatus = useCallback(async () => {
    if (!user?.id) {
      setHasPendingVerification(false);
      return;
    }

    const { data } = await supabase
      .from('verification_requests')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();

    setHasPendingVerification((data as any)?.status === 'pending');
  }, [user?.id]);

  useEffect(() => {
    setFullName(user?.full_name ?? '');
    setBibleVersion(user?.bible_version ?? 'niv');
    setReminderTime(user?.reminder_time ?? '06:00');
    setEmailDraft(user?.email ?? '');
    setAvatarPreviewUri(user?.avatar_url ?? null);
    setPickedAvatarBase64(null);
    setPickedAvatarMimeType(null);
    setFoundationCertificate(null);

    if (user?.id) {
      checkVerificationStatus();
    }
  }, [checkVerificationStatus, user]);

  const displayName = user?.full_name?.trim() || 'Grace Okafor';
  const initials = useMemo(() => getInitials(user?.full_name, user?.email), [user?.email, user?.full_name]);
  const reminderTimeLabel = formatReminderTime(user?.reminder_time);
  const bibleVersionLabel = formatBibleVersion(user?.bible_version);
  const memberBadgeLabel = `${getRoleLabel(user?.role)} · ${bibleVersionLabel}`;
  const syncTimestampLabel = formatSyncTimestamp(lastSyncAt);
  const pendingSyncLabel = syncSummary.total === 1
    ? '1 action waiting to sync.'
    : `${syncSummary.total} actions waiting to sync.`;
  const syncDescription = syncSummary.total > 0
    ? isOnline === false
      ? 'You are offline right now. New actions are safely queued and will send when your connection returns.'
      : 'Your queued activity is safe. Retry now or leave the app open and we will keep trying automatically.'
    : isOnline === false
      ? 'You are offline, but there is nothing waiting to sync at the moment.'
      : 'Everything is up to date across your account right now.';
  const syncBreakdown = [
    syncSummary.prayerCount > 0 ? `${syncSummary.prayerCount} prayer${syncSummary.prayerCount === 1 ? '' : 's'}` : null,
    syncSummary.messageCount > 0 ? `${syncSummary.messageCount} message${syncSummary.messageCount === 1 ? '' : 's'}` : null,
    syncSummary.rsvpCount > 0 ? `${syncSummary.rsvpCount} RSVP${syncSummary.rsvpCount === 1 ? '' : 's'}` : null,
  ].filter(Boolean) as string[];

  useFocusEffect(
    useCallback(() => {
      void refreshSyncStatus();
    }, [refreshSyncStatus])
  );

  const handleRetrySync = async () => {
    if (!user?.id) {
      return;
    }

    try {
      const result = await retrySync();

      if (result.processedCount > 0 && result.remainingCount === 0) {
        showToast({
          title: 'Sync complete',
          message: 'Your queued changes were sent successfully.',
          variant: 'success',
        });
        return;
      }

      if (result.processedCount > 0) {
        showToast({
          title: 'Partly synced',
          message: 'Some queued changes were sent, but a few still need another retry.',
          variant: 'info',
        });
        return;
      }

      if (result.remainingCount > 0) {
        showToast({
          title: isOnline === false ? 'Still offline' : 'Nothing changed yet',
          message: isOnline === false
            ? 'Those actions are still queued and will send automatically once your connection is back.'
            : 'We could not send the queued changes just yet. Please try again in a moment.',
          variant: isOnline === false ? 'warning' : 'info',
        });
        return;
      }

      showToast({
        title: 'All caught up',
        message: 'There are no queued changes waiting to sync.',
        variant: 'success',
      });
    } catch (error) {
      console.error('Manual sync retry error:', error);
      showToast({
        title: 'Sync failed',
        message: 'We could not retry queued changes right now. Please try again shortly.',
        variant: 'error',
      });
    }
  };

  const openEditor = (mode: Exclude<EditorMode, null>) => {
    setEditorError(null);
    setIsSaving(false);
    setFullName(user?.full_name ?? '');
    setBibleVersion(user?.bible_version ?? 'niv');
    setReminderTime(user?.reminder_time ?? '06:00');
    setPassword('');
    setConfirmPassword('');
    setEmailDraft(user?.email ?? '');
    setAvatarPreviewUri(user?.avatar_url ?? null);
    setPickedAvatarBase64(null);
    setPickedAvatarMimeType(null);
    setFoundationCertificate(null);
    setEditorMode(mode);
  };

  const closeEditor = () => {
    if (isSaving) {
      return;
    }

    setEditorMode(null);
    setEditorError(null);
    setPassword('');
    setConfirmPassword('');
    setPickedAvatarBase64(null);
    setPickedAvatarMimeType(null);
    setFoundationCertificate(null);
  };

  const handlePickAvatar = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      setEditorError('Photo library access is required to choose a profile image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset?.base64) {
      setEditorError('We could not read that photo. Please try another image.');
      return;
    }

    setEditorError(null);
    setAvatarPreviewUri(asset.uri);
    setPickedAvatarBase64(asset.base64);
    setPickedAvatarMimeType(asset.mimeType ?? 'image/jpeg');
  };

  const handleRemoveAvatar = () => {
    setAvatarPreviewUri(null);
    setPickedAvatarBase64(null);
    setPickedAvatarMimeType(null);
  };

  const handlePickCertificate = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      setEditorError('Photo library access is required to choose a certificate image.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        setFoundationCertificate({
          uri: asset.uri,
          name: asset.fileName ?? 'certificate.jpg',
        });
        setEditorError(null);
      }
    } catch {
      setEditorError('Error picking certificate image.');
    }
  };

  const handleVerseToggle = async (value: boolean) => {
    setNotifVerse(value);

    if (value) {
      await scheduleDailyVerseNotification(DAILY_VERSE, user?.reminder_time ?? reminderTime);
      return;
    }

    await cancelDailyVerseNotifications();
  };

  const handleSignOut = async () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'Account deletion still needs a secure backend workflow. For now, contact the church admin so they can help you remove your profile safely.'
    );
  };

  const handleEmailPress = () => {
    openEditor('email');
  };

  const handleSaveProfile = async () => {
    if (!user) {
      return;
    }

    const validationError = getProfileValidationError(fullName);

    if (validationError) {
      setEditorError(validationError);
      return;
    }

    try {
      setIsSaving(true);
      setEditorError(null);
      let nextAvatarUrl = avatarPreviewUri;

      if (pickedAvatarBase64) {
        nextAvatarUrl = await uploadProfileAvatar({
          userId: user.id,
          base64: pickedAvatarBase64,
          contentType: pickedAvatarMimeType,
        });
      }

      const updatedUser = await updateProfile(user.id, {
        full_name: fullName,
        avatar_url: nextAvatarUrl,
      });

      setUser(updatedUser);
      setEditorMode(null);
      setPickedAvatarBase64(null);
      setPickedAvatarMimeType(null);
      showToast({
        title: 'Profile updated',
        message: 'Your personal details are now up to date.',
        variant: 'success',
      });
    } catch (error) {
      console.error('Profile update error:', error);
      const message = error instanceof Error
        ? getAvatarUploadErrorMessage(error.message)
        : 'We could not save your profile right now. Please try again.';
      setEditorError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!user) {
      return;
    }

    const normalizedReminderTime = reminderTime.trim();

    if (!TIME_24H_REGEX.test(normalizedReminderTime)) {
      setEditorError('Reminder time must use 24-hour format like 06:00 or 19:30.');
      return;
    }

    try {
      setIsSaving(true);
      setEditorError(null);

      const updatedUser = await updateProfile(user.id, {
        bible_version: bibleVersion,
        reminder_time: normalizedReminderTime,
      });

      setUser(updatedUser);

      if (notifVerse) {
        await cancelDailyVerseNotifications();
        await scheduleDailyVerseNotification(DAILY_VERSE, normalizedReminderTime);
      }

      setEditorMode(null);
      showToast({
        title: 'Preferences updated',
        message: 'Your Bible and reminder settings have been saved.',
        variant: 'success',
      });
    } catch (error) {
      console.error('Preference update error:', error);
      setEditorError('We could not save those preferences right now. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePassword = async () => {
    const validationError = getPasswordValidationError(password, confirmPassword);

    if (validationError) {
      setEditorError(validationError);
      return;
    }

    try {
      setIsSaving(true);
      setEditorError(null);

      await updateAccountPassword(password);

      setEditorMode(null);
      showToast({
        title: 'Password updated',
        message: 'Your password has been changed successfully.',
        variant: 'success',
      });
    } catch (error) {
      console.error('Password update error:', error);
      setEditorError('We could not update your password right now. You may need to sign in again and retry.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    const validationError = getEmailValidationError(emailDraft, user?.email);

    if (validationError) {
      setEditorError(validationError);
      return;
    }

    try {
      setIsSaving(true);
      setEditorError(null);

      const nextEmail = await updateAccountEmail(emailDraft);

      setEditorMode(null);
      showToast({
        title: 'Verify your new email',
        message: `We started the email change to ${nextEmail}. Open the verification link from your inbox to finish updating your sign-in email.`,
        variant: 'info',
        duration: 4200,
      });
    } catch (error) {
      console.error('Email update error:', error);
      const message = error instanceof Error
        ? getEmailUpdateErrorMessage(error.message)
        : 'We could not start your email change right now. Please try again in a moment.';
      setEditorError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestVerification = async () => {
    if (!user?.id) return;

    if (!foundationCertificate) {
      setEditorError('Please upload your Foundation School Certificate to proceed with Level 2 verification.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user.id,
          status: 'pending',
          reason: `Level 2 Verification Request with Certificate: ${foundationCertificate.name}`
        } as never);

      if (error) throw error;

      setHasPendingVerification(true);
      setEditorMode(null);
      showToast({
        title: 'Request sent',
        message: 'Church admins will review your Foundation School Certificate for verification.',
        variant: 'success'
      });
    } catch (err) {
      console.error('Verification error:', err);
      setEditorError('You have already requested verification or a server error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderEditorBody = () => {
    if (editorMode === 'profile') {
      return (
        <>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Personal details</Text>
          <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
            Keep your name and profile photo current so prayer, chat, and event spaces feel more personal.
          </Text>
          <View style={[styles.avatarEditorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {avatarPreviewUri ? (
              <Animatable.Image
                animation="bounceIn"
                duration={700}
                source={{ uri: avatarPreviewUri }}
                style={styles.avatarEditorImage}
                key={avatarPreviewUri}
              />
            ) : (
              <View style={[styles.avatarEditorFallback, { backgroundColor: theme.accentLight }]}> 
                <Text style={[styles.avatarEditorFallbackText, { color: theme.accentDeep }]}> 
                  {getInitials(fullName, user?.email)}
                </Text> 
              </View>
            )}
            <View style={styles.avatarEditorActions}>
              <Button
                label="Choose photo"
                onPress={handlePickAvatar}
                variant="outline"
                accentColor={theme.accent}
                style={styles.avatarButton}
              />
              <Button
                label="Remove"
                onPress={handleRemoveAvatar}
                variant="secondary"
                style={styles.avatarButton}
              />
            </View>
          </View>
          <TextInput
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            autoCapitalize="words"
            accentColor={theme.accent}
            containerStyle={styles.sheetField}
          />
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Photos are cropped to a square and uploaded to your Supabase storage bucket so your avatar follows you across devices.
          </Text>
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.text }]}>Email</Text>
            <Text style={[styles.infoValue, { color: colors.textSecondary }]}>{user?.email ?? 'No email available'}</Text>
          </View>
          {editorError ? <Text style={styles.sheetError}>{editorError}</Text> : null}
          <View style={styles.sheetActions}>
            <Button
              label="Cancel"
              onPress={closeEditor}
              variant="outline"
              accentColor={theme.accent}
              style={styles.sheetActionButton}
            />
            <Button
              label="Save details"
              onPress={handleSaveProfile}
              loading={isSaving}
              accentColor={theme.accent}
              style={styles.sheetActionButton}
            />
          </View>
        </>
      );
    }

    if (editorMode === 'preferences') {
      return (
        <>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Reading preferences</Text>
          <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
            These settings shape your daily verse reminders and make the app feel more like your space.
          </Text>
          <Text style={[styles.sheetSectionLabel, { color: colors.text }]}>Bible version</Text>
          <View style={styles.optionRow}>
            {BIBLE_VERSION_OPTIONS.map((option) => {
              const selected = bibleVersion === option.value;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionChip,
                    {
                      borderColor: selected ? theme.accent : colors.border,
                      backgroundColor: selected ? theme.accentLight : colors.card,
                    },
                  ]}
                  onPress={() => setBibleVersion(option.value)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      { color: selected ? theme.accentDeep : colors.text },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.sheetSectionLabel, { color: colors.text }]}>Daily verse reminder</Text>
          <View style={styles.optionRow}>
            {REMINDER_TIME_OPTIONS.map((time) => {
              const selected = reminderTime === time;

              return (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.optionChip,
                    {
                      borderColor: selected ? theme.accent : colors.border,
                      backgroundColor: selected ? theme.accentLight : colors.card,
                    },
                  ]}
                  onPress={() => setReminderTime(time)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      { color: selected ? theme.accentDeep : colors.text },
                    ]}
                  >
                    {formatReminderTime(time)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            label="Custom time"
            value={reminderTime}
            onChangeText={setReminderTime}
            placeholder="06:00"
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            accentColor={theme.accent}
            containerStyle={styles.sheetField}
          />
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Use 24-hour time like 06:00 or 19:30. If daily verse reminders are enabled, the new time is applied right away.
          </Text>
          {editorError ? <Text style={styles.sheetError}>{editorError}</Text> : null}
          <View style={styles.sheetActions}>
            <Button
              label="Cancel"
              onPress={closeEditor}
              variant="outline"
              accentColor={theme.accent}
              style={styles.sheetActionButton}
            />
            <Button
              label="Save preferences"
              onPress={handleSavePreferences}
              loading={isSaving}
              accentColor={theme.accent}
              style={styles.sheetActionButton}
            />
          </View>
        </>
      );
    }

    if (editorMode === 'password') {
      return (
        <>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Change password</Text>
          <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
            Update your password here so you do not have to leave the app when you want to secure your account.
          </Text>
          <TextInput
            label="New password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            autoCapitalize="none"
            accentColor={theme.accent}
            containerStyle={styles.sheetField}
          />
          <TextInput
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Retype your new password"
            secureTextEntry
            autoCapitalize="none"
            accentColor={theme.accent}
            containerStyle={styles.sheetField}
          />
          {editorError ? <Text style={styles.sheetError}>{editorError}</Text> : null}
          <View style={styles.sheetActions}>
            <Button
              label="Cancel"
              onPress={closeEditor}
              variant="outline"
              accentColor={theme.accent}
              style={styles.sheetActionButton}
            />
            <Button
              label="Update password"
              onPress={handleSavePassword}
              loading={isSaving}
              accentColor={theme.accent}
              style={styles.sheetActionButton}
            />
          </View>
        </>
      );
    }

    if (editorMode === 'email') {
      return (
        <>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Change email</Text>
          <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
            Update the email connected to your account without leaving the app. You will need to verify the new address before the change is completed.
          </Text>
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.text }]}>Current email</Text>
            <Text style={[styles.infoValue, { color: colors.textSecondary }]}>{user?.email ?? 'No email available'}</Text>
          </View>
          <TextInput
            label="New email"
            value={emailDraft}
            onChangeText={setEmailDraft}
            placeholder="name@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            accentColor={theme.accent}
            containerStyle={styles.sheetField}
          />
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Supabase will send a verification email. Until you confirm it, your current sign-in email stays active.
          </Text>
          {editorError ? <Text style={styles.sheetError}>{editorError}</Text> : null}
          <View style={styles.sheetActions}>
            <Button
              label="Cancel"
              onPress={closeEditor}
              variant="outline"
              accentColor={theme.accent}
              style={styles.sheetActionButton}
            />
            <Button
              label="Send verification"
              onPress={handleSaveEmail}
              loading={isSaving}
              accentColor={theme.accent}
              style={styles.sheetActionButton}
            />
          </View>
        </>
      );
    }

    if (editorMode === 'verification') {
      return (
        <>
          <View style={styles.verifySheetIcon}>
            <Ionicons name="ribbon" size={60} color={theme.accent} />
          </View>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Level 2 Verification</Text>
          <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
            To unlock the golden verification mark and community trust badges, please upload a photo of your Foundation School Certificate.
          </Text>
          <View style={[styles.uploadSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {foundationCertificate ? (
              <View style={styles.certificatePreview}>
                <Ionicons name="image" size={32} color={theme.accent} />
                <Text style={[styles.certificateName, { color: colors.text }]} numberOfLines={1}>
                  {foundationCertificate.name}
                </Text>
                <TouchableOpacity onPress={() => setFoundationCertificate(null)}>
                  <Ionicons name="close-circle" size={24} color={BaseColors.red500} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadPlaceholder} onPress={handlePickCertificate}>
                <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.uploadText, { color: colors.textSecondary }]}>Tap to take a photo of your certificate</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={[styles.benefitsCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: Spacing.xl }]}>
            <Text style={[styles.benefitItem, { color: colors.textSecondary }]}>• Golden verified badge next to your name.</Text>
            <Text style={[styles.benefitItem, { color: colors.textSecondary }]}>• Official recognition as a Foundation School Graduate.</Text>
            <Text style={[styles.benefitItem, { color: colors.textSecondary }]}>• Priority support for ministry participation.</Text>
          </View>
          {editorError ? <Text style={styles.sheetError}>{editorError}</Text> : null}
          <View style={styles.sheetActions}>
            <Button
              label="Cancel"
              onPress={closeEditor}
              variant="outline"
              accentColor={theme.accent}
              style={styles.sheetActionButton}
            />
            <Button
              label="Submit Certificate"
              onPress={handleRequestVerification}
              loading={isSaving}
              accentColor={theme.accent}
              style={styles.sheetActionButton}
            />
          </View>
        </>
      );
    }

    if (editorMode === 'appearance') {
      const OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
        { value: 'light', label: 'Light', icon: 'sunny-outline' },
        { value: 'dark', label: 'Dark', icon: 'moon-outline' },
        { value: 'system', label: 'System', icon: 'settings-outline' },
      ];

      return (
        <>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Appearance</Text>
          <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
            Choose how Gather looks on your device. System mode matches your phone&apos;s current setting.
          </Text>
          <View style={styles.optionList}>
            {OPTIONS.map((opt) => {
              const selected = themeMode === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.appearanceOption,
                    { borderColor: selected ? theme.accent : colors.border, backgroundColor: selected ? theme.accentLight : colors.card },
                  ]}
                  onPress={() => setThemeMode(opt.value)}
                >
                  <Ionicons name={opt.icon} size={20} color={selected ? theme.accent : colors.textSecondary} />
                  <Text style={[styles.appearanceLabel, { color: selected ? theme.accentDeep : colors.text }]}>{opt.label}</Text>
                  {selected && <Ionicons name="checkmark-circle" size={20} color={theme.accent} />}
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.sheetActions}>
            <Button
              label="Done"
              onPress={closeEditor}
              accentColor={theme.accent}
              style={styles.sheetActionButton}
            />
          </View>
        </>
      );
    }

    return null;
  };

  // ── Guest view ──────────────────────────────────────────────────────────────
  if (!user) {
    const parentNav = navigation.getParent();
    const goToAuth = () => {
      setIsGuest(false);
      // Try navigating to 'Auth' if available, else fallback to 'Login' in AuthNavigator
      if (parentNav && parentNav.getState && parentNav.getState().routeNames?.includes('Auth')) {
        parentNav.navigate('Auth' as never);
      } else {
        navigation.navigate('Login' as never);
      }
    };
    return (
      <GuestProfilePrompt
        theme={theme}
        colors={colors}
        onRegister={goToAuth}
        onLogin={goToAuth}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: BaseColors.brown900 }}>
        <View style={styles.hero}>
          <View style={[styles.heroBg, { backgroundColor: theme.accentSubtle }]} />
          <View style={styles.heroHeader}>
            <Text style={styles.heroTitle}>My Profile</Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEditor('profile')} activeOpacity={0.8}>
              <Ionicons name="pencil" size={16} color={BaseColors.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.heroContent}>
            <View style={styles.avatarWrap}>
              {user?.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarCircle, { backgroundColor: theme.accent }]}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              {user?.is_verified && (
                <View style={[styles.verifiedBadge, { backgroundColor: theme.accent }]}>
                  <Ionicons name="checkmark" size={10} color={BaseColors.white} />
                </View>
              )}
            </View>
            <View style={styles.heroInfo}>
              <View style={styles.nameHeader}>
                <Text style={styles.heroName}>{displayName}</Text>
                {user?.is_verified && (
                  <Ionicons name="checkmark-circle" size={18} color="#D4AF37" style={styles.nameVerifyIcon} />
                )}
                {user?.role === 'pastor' || user?.role === 'admin' ? (
                   <Ionicons name="checkmark-circle" size={18} color="#000000" style={styles.nameVerifyIcon} />
                ) : null}
              </View>
              <View style={styles.heroChurchRow}>
                <Image
                  source={require('../../../assets/icon.png')}
                  style={styles.heroLogo}
                  resizeMode="contain"
                />
                <Text style={[styles.heroChurch, { color: theme.accentBorder }]}>
                  {CHURCH.name}
                </Text>
              </View>
              <View
                style={[
                  styles.memberBadge,
                  {
                    backgroundColor: theme.accentSubtle,
                    borderColor: `${theme.accent}55`,
                  },
                ]}
              >
                <Text style={[styles.memberBadgeText, { color: theme.accentBorder }]}>
                  {memberBadgeLabel}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {!user?.is_verified && (
          <TouchableOpacity
            style={[styles.verifyBanner, { backgroundColor: theme.accentLight }]}
            onPress={() => openEditor('verification')}
          >
            <Ionicons name="ribbon-outline" size={20} color={theme.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.verifyBannerTitle, { color: theme.accentDeep }]}>
                {hasPendingVerification ? 'Verification Pending' : 'Get Level 2 Verification'}
              </Text>
              <Text style={[styles.verifyBannerSub, { color: colors.textSecondary }]}>
                {hasPendingVerification
                  ? 'Church staff are reviewing your certificate.'
                  : 'Upload your Foundation School Certificate to get the golden mark.'}
              </Text>
            </View>
            {!hasPendingVerification && <Ionicons name="chevron-forward" size={16} color={theme.accent} />}
          </TouchableOpacity>
        )}

        <View style={[styles.card, styles.streakCard, { borderTopColor: theme.accent, backgroundColor: colors.card, borderColor: colors.border, marginTop: Spacing.xl }]}>
          <View style={styles.streakHead}>
            <Text style={[styles.streakTitle, { color: colors.text }]}>Reading streak</Text>
            <View style={[styles.streakBadge, { backgroundColor: theme.accentLight }]}>
              <Text style={[styles.streakBadgeText, { color: theme.accentDeep }]}>
                🔥 {user?.streak_count ?? 0} days
              </Text>
            </View>
          </View>
          <View style={styles.streakDays}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => {
              const activeDays = Math.min(user?.streak_count ?? 0, 7);
              const completed = index < activeDays;

              return (
                <View key={day + index} style={styles.streakDayItem}>
                  <Text style={[styles.streakDayLabel, { color: colors.textMuted }]}>{day}</Text>
                  <View
                    style={[
                      styles.streakDayDot,
                      {
                        backgroundColor: completed ? theme.accent : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.streakDayIcon,
                        { color: completed ? BaseColors.white : colors.textMuted },
                      ]}
                    >
                      {completed ? '✓' : '•'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
          <View style={[styles.streakFooter, { borderTopColor: colors.border }]}>
            <Text style={[styles.streakPlan, { color: colors.textSecondary }]}>
              {user?.streak_count
                ? `You are building steady Bible habits at ${reminderTimeLabel}.`
                : 'Turn on reminders and start a fresh reading streak today.'}
            </Text>
            <TouchableOpacity onPress={() => scrollRef.current?.scrollTo({ y: preferencesY.current, animated: true })}>
              <Text style={[styles.streakLink, { color: theme.accent }]}>Refine preferences</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.groupHeader, { color: colors.text }]}>Sync status</Text>
        <View style={[styles.card, styles.syncCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.syncHeader}>
            <View
              style={[
                styles.syncStatePill,
                {
                  backgroundColor: isOnline === false ? BaseColors.warm100 : theme.accentLight,
                  borderColor: isOnline === false ? BaseColors.gold : theme.accentBorder,
                },
              ]}
            >
              <Ionicons
                name={isOnline === false ? 'cloud-offline-outline' : 'cloud-done-outline'}
                size={14}
                color={isOnline === false ? BaseColors.gold : theme.accent}
              />
              <Text
                style={[
                  styles.syncStateText,
                  { color: isOnline === false ? BaseColors.gold : theme.accentDeep },
                ]}
              >
                {isOnline === false ? 'Offline' : 'Online'}
              </Text>
            </View>
            <View
              style={[
                styles.syncCountPill,
                { backgroundColor: colors.background, borderColor: colors.border },
                syncSummary.total > 0 && {
                  backgroundColor: BaseColors.warm100,
                  borderColor: BaseColors.gold,
                },
              ]}
            >
              <Text
                style={[
                  styles.syncCountText,
                  { color: colors.textSecondary },
                  syncSummary.total > 0 && { color: BaseColors.gold },
                ]}
              >
                {syncSummary.total > 0 ? `${syncSummary.total} pending` : 'All caught up'}
              </Text>
            </View>
          </View>

          <Text style={[styles.syncTitle, { color: colors.text }]}>
            {syncSummary.total > 0 ? pendingSyncLabel : 'No queued changes right now.'}
          </Text>
          <Text style={[styles.syncBody, { color: colors.textSecondary }]}>{syncDescription}</Text>

          {syncBreakdown.length > 0 ? (
            <View style={styles.syncBreakdownRow}>
              {syncBreakdown.map((item) => (
                <View key={item} style={[styles.syncBreakdownChip, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.syncBreakdownText, { color: colors.textSecondary }]}>{item}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {syncTimestampLabel ? (
            <Text style={[styles.syncTimestamp, { color: colors.textMuted }]}>{syncTimestampLabel}</Text>
          ) : null}

          <View style={styles.syncActionRow}>
            <Button
              label={syncSummary.total > 0 ? 'Retry sync now' : 'Refresh status'}
              onPress={handleRetrySync}
              loading={isRetryingSync}
              disabled={syncSummary.total > 0 && isOnline === false}
              variant={syncSummary.total > 0 ? 'primary' : 'outline'}
              accentColor={theme.accent}
              style={styles.syncActionButton}
            />
          </View>
        </View>

        <Text style={[styles.groupHeader, { color: colors.text }]}>Notifications</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="notifications"
            label="Push notifications"
            toggle
            toggleValue={notifPush}
            onToggle={setNotifPush}
            iconBg={theme.accentLight}
            iconColor={theme.accent}
            colors={colors}
          />
          <SettingRow
            icon="book"
            label="Daily verse reminder"
            toggle
            toggleValue={notifVerse}
            onToggle={handleVerseToggle}
            iconBg={theme.accentLight}
            iconColor={theme.accent}
            colors={colors}
          />
          <SettingRow
            icon="chatbubble"
            label="Group messages"
            toggle
            toggleValue={notifGroups}
            onToggle={setNotifGroups}
            iconBg={theme.accentLight}
            iconColor={theme.accent}
            colors={colors}
          />
          <SettingRow
            icon="calendar"
            label="Event reminders"
            toggle
            toggleValue={notifEvents}
            onToggle={setNotifEvents}
            iconBg={theme.accentLight}
            iconColor={theme.accent}
            colors={colors}
          />
        </View>

        <Text
          style={[styles.groupHeader, { color: colors.text }]}
          onLayout={(e) => { preferencesY.current = e.nativeEvent.layout.y; }}
        >
          Preferences
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="color-palette"
            label="Theme / accent colour"
            iconBg={theme.accentLight}
            iconColor={theme.accent}
            onPress={() => navigation.navigate('ThemePicker', { fromOnboarding: false })}
            colors={colors}
          />
          <SettingRow
            icon="book-outline"
            label="Bible version"
            value={bibleVersionLabel}
            onPress={() => openEditor('preferences')}
            colors={colors}
          />
          <SettingRow
            icon="time-outline"
            label="Reminder time"
            value={reminderTimeLabel}
            onPress={() => openEditor('preferences')}
            colors={colors}
          />
          <SettingRow
            icon="sunny-outline"
            label="Appearance"
            value={themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}
            onPress={() => openEditor('appearance')}
            colors={colors}
          />
        </View>

        <Text style={[styles.groupHeader, { color: colors.text }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="person-outline"
            label="Personal details"
            value={displayName}
            onPress={() => openEditor('profile')}
            colors={colors}
          />
          <SettingRow
            icon="lock-closed-outline"
            label="Change password"
            onPress={() => openEditor('password')}
            colors={colors}
          />
          <SettingRow
            icon="mail-outline"
            label="Email"
            value={user?.email}
            onPress={handleEmailPress}
            colors={colors}
          />
          <SettingRow
            icon="trash-outline"
            label="Delete account"
            iconBg={BaseColors.dangerLight}
            danger
            onPress={handleDeleteAccount}
            colors={colors}
          />
        </View>

        <TouchableOpacity style={[styles.signOutBtn, { borderColor: colors.border }]} onPress={handleSignOut} activeOpacity={0.75}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: colors.textMuted }]}>
          Gather v1.0.0 · Made with care for {CHURCH.name}
        </Text>
      </ScrollView>

      <Modal
        visible={Boolean(editorMode)}
        transparent
        animationType="slide"
        onRequestClose={closeEditor}
      >
        <Pressable style={styles.sheetBackdrop} onPress={closeEditor} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetKeyboard}
        >
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetContent}
              keyboardShouldPersistTaps="handled"
            >
              {renderEditorBody()}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    backgroundColor: BaseColors.brown900,
    padding: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 2,
  },
  heroBg: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  heroTitle: {
    fontFamily: Typography.serif,
    fontSize: Typography.sizes.xl,
    color: BaseColors.white,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl },
  avatarWrap: { position: 'relative' },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: BaseColors.brown100,
  },
  avatarText: { fontFamily: Typography.sansSemiBold, fontSize: 22, color: BaseColors.white },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: BaseColors.brown900,
  },
  heroInfo: { flex: 1 },
  nameHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  heroName: {
    fontFamily: Typography.serif,
    fontSize: Typography.sizes.xl,
    color: BaseColors.white,
  },
  nameVerifyIcon: { marginTop: 2 },
  heroChurchRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: Spacing.sm },
  heroLogo: { width: 14, height: 14 },
  heroChurch: { fontFamily: Typography.sans, fontSize: Typography.sizes.xs },
  memberBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
  },
  memberBadgeText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.xs },
  statsRow: {
    flexDirection: 'row',
    gap: 1,
    marginHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginTop: Spacing.xl,
  },
  statBox: {
    flex: 1,
    minHeight: 84,
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNum: {
    fontFamily: Typography.serif,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
  },
  statLabel: {
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.xs,
    marginTop: 3,
    textAlign: 'center',
  },
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    gap: Spacing.md,
  },
  verifyBannerTitle: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm },
  verifyBannerSub: { fontFamily: Typography.sans, fontSize: 11, marginTop: 2 },
  groupHeader: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  card: {
    marginHorizontal: Spacing.xl,
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  streakCard: { borderTopWidth: 3 },
  syncCard: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  syncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  syncStatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  syncStateText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.xs,
  },
  syncCountPill: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  syncCountText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.xs,
  },
  syncTitle: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.base,
  },
  syncBody: {
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.sm,
    lineHeight: 21,
  },
  syncBreakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  syncBreakdownChip: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  syncBreakdownText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.xs,
  },
  syncTimestamp: {
    fontFamily: Typography.sansMedium,
    fontSize: 10,
  },
  syncActionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  syncActionButton: {
    flex: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    flex: 1,
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.base,
  },
  settingValue: {
    maxWidth: 126,
    fontFamily: Typography.sansMedium,
    fontSize: Typography.sizes.sm,
    textAlign: 'right',
  },
  streakHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  streakTitle: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.base,
  },
  streakBadge: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  streakBadgeText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm },
  streakDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  streakDayItem: { alignItems: 'center', gap: 4 },
  streakDayLabel: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.xs,
  },
  streakDayDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakDayIcon: { fontSize: 11, fontFamily: Typography.sansSemiBold },
  streakFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  streakPlan: {
    flex: 1,
    fontFamily: Typography.sansMedium,
    fontSize: Typography.sizes.sm,
  },
  streakLink: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm },
  signOutBtn: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    borderWidth: 1.5,
    borderRadius: Radius.xl,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.base,
    color: BaseColors.red500,
  },
  versionText: {
    fontFamily: Typography.sans,
    fontSize: 10,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.42)',
  },
  sheetKeyboard: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '84%',
    minHeight: '48%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: Radius.full,
    marginTop: Spacing.md,
  },
  sheetContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  sheetTitle: {
    fontFamily: Typography.serif,
    fontSize: Typography.sizes['2xl'],
    marginBottom: Spacing.sm,
  },
  sheetSubtitle: {
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.base,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  sheetSectionLabel: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.sm,
  },
  sheetField: { marginBottom: Spacing.md },
  avatarEditorCard: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  avatarEditorImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: BaseColors.brown100,
    marginBottom: Spacing.md,
  },
  avatarEditorFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarEditorFallbackText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes['2xl'],
  },
  avatarEditorActions: {
    width: '100%',
    flexDirection: 'row',
    gap: Spacing.md,
  },
  avatarButton: { flex: 1 },
  helperText: {
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
    marginTop: -2,
    marginBottom: Spacing.lg,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  infoLabel: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.sm,
    marginBottom: 4,
  },
  infoValue: {
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.base,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  optionChip: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  optionChipText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.sm,
  },
  sheetError: {
    fontFamily: Typography.sansMedium,
    fontSize: Typography.sizes.sm,
    color: BaseColors.red500,
    marginBottom: Spacing.md,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  sheetActionButton: { flex: 1 },
  verifySheetIcon: { alignItems: 'center', marginBottom: Spacing.md },
  benefitsCard: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.lg },
  benefitItem: { fontFamily: Typography.sans, fontSize: Typography.sizes.sm, marginBottom: 8 },
  uploadSection: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  uploadPlaceholder: { alignItems: 'center', gap: Spacing.sm },
  uploadText: { fontFamily: Typography.sans, fontSize: Typography.sizes.sm, textAlign: 'center' },
  certificatePreview: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, width: '100%' },
  certificateName: { flex: 1, fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm },
  optionList: { gap: Spacing.sm, marginBottom: Spacing.xl },
  appearanceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  appearanceLabel: { flex: 1, fontFamily: Typography.sansMedium, fontSize: Typography.sizes.base },
});
