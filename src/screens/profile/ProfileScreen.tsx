// src/screens/profile/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import HeaderBar from '../../components/common/HeaderBar';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { BaseColors, Spacing, Radius, CHURCH } from '../../constants/theme';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL, HELP_CENTER_URL } from '../../constants/links';
import { useProfile } from './hooks/useProfile';
import { useAdminVerification } from './hooks/useAdminVerification';
import { t, getDeviceLocale } from '../../services/locale';
import { SettingRow, GuestProfilePrompt, EditableAvatar, VerificationBadge } from './components/ProfileComponents';
import PolicyWebModal from '../../components/common/PolicyWebModal';
import { ProfileEditor, PreferencesEditor } from './components/ProfileModals';
import type { ProfileScreenNavigationProp } from '../../types/navigation';

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const locale = getDeviceLocale();
  const { theme, colors, themeMode } = useThemeStore();
  const { setIsGuest, notificationsEnabled } = useAuthStore();
  const { user, isSaving, hasPendingVerification, handlePickAvatar, updatePersonalInfo, updatePreferences, handleSignOut } = useProfile();
  const { requests, isLoading, fetchRequests, refresh, reviewRequest, openCertificate } = useAdminVerification(user?.role === 'admin');

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const [activeEditor, setEditor] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchRequests();
    }
  }, [user?.role, fetchRequests]);

  if (!user) return <GuestProfilePrompt theme={theme} colors={colors} onAuth={() => setIsGuest(false)} />;

  const onRefresh = async () => {
    if (user.role === 'admin') {
      await refresh();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar title={t('myProfile', locale)} showBack={false} enableBlur />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={user.role === 'admin' ? <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={theme.accent} /> : undefined}
      >
        <View style={[styles.hero, { backgroundColor: themeMode === 'dark' ? colors.card : BaseColors.brown900 }]}>
          <EditableAvatar
            uri={user.avatar_url}
            name={user.full_name}
            onEdit={handlePickAvatar}
            isUploading={isSaving}
            theme={theme}
            colors={colors}
          />
          <View style={styles.heroInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.heroName}>{user.full_name}</Text>
              <VerificationBadge verified={user.is_verified} pending={hasPendingVerification} colors={colors} />
            </View>
            <Text style={{ color: themeMode === 'dark' ? colors.textSecondary : 'rgba(255,255,255,0.7)' }}>{CHURCH.name}</Text>
            <TouchableOpacity onPress={() => setEditor('profile')} style={styles.editBtn}>
              <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '600' }}>{t('editProfile', locale)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.groupHeader, { color: colors.textSecondary }]}>{t('account', locale)}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="person-outline" label={t('personalDetails', locale)} value={user.full_name} onPress={() => setEditor('profile')} colors={colors} />
          <SettingRow icon="mail-outline" label={t('email', locale)} value={user.email} onPress={() => {}} colors={colors} />
        </View>

        <Text style={[styles.groupHeader, { color: colors.textSecondary }]}>{t('appSettings', locale)}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="color-palette-outline" label={t('themeLabel', locale)} value={theme.name} onPress={() => navigation.navigate('ThemePicker', { fromOnboarding: false })} colors={colors} iconColor={theme.accent} />
          <SettingRow icon="moon-outline" label={t('appearance', locale)} value={themeMode === 'system' ? t('systemDefault', locale) : themeMode === 'dark' ? t('dark', locale) : t('light', locale)} onPress={() => navigation.navigate('ThemePicker', { fromOnboarding: false, activeTab: 'appearance' })} colors={colors} iconColor={theme.accent} />
          <SettingRow icon="notifications-outline" label={t('dailyVerseReminder', locale)} value={notificationsEnabled ? user.reminder_time : t('off', locale)} onPress={() => setEditor('preferences')} colors={colors} />
        </View>

        <Text style={[styles.groupHeader, { color: colors.textSecondary }]}>{t('supportLegal', locale)}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="help-circle-outline" label={t('helpCenter', locale)} onPress={() => Linking.openURL(HELP_CENTER_URL)} colors={colors} />
          <SettingRow icon="shield-checkmark-outline" label={t('privacyPolicy', locale)} onPress={() => setShowPrivacyModal(true)} colors={colors} />
          <SettingRow icon="document-text-outline" label={t('termsOfService', locale)} onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)} colors={colors} />
        </View>

        {user.role === 'admin' && requests.length > 0 && (
          <View style={styles.adminSection}>
            <Text style={[styles.groupHeader, { color: colors.text }]}>{t('adminPendingVerification', locale)}</Text>
            {requests.map(r => (
              <View key={r.id} style={[styles.card, styles.adminCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.adminCardHeader}>
                  <View>
                    <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>{r.profile.full_name}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{r.profile.email}</Text>
                  </View>
                  <TouchableOpacity style={styles.viewProofBtn} onPress={() => openCertificate(r)}>
                    <Ionicons name="eye-outline" size={16} color={theme.accent} />
                    <Text style={{ color: theme.accent, fontWeight: '600' }}>{t('proof', locale)}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.adminActions}>
                  <TouchableOpacity style={[styles.adminBtn, { backgroundColor: BaseColors.green500 }]} onPress={() => reviewRequest(r, 'approved')}>
                    <Text style={styles.adminBtnText}>{t('approve', locale)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.adminBtn, { backgroundColor: BaseColors.red500 }]} onPress={() => reviewRequest(r, 'rejected')}>
                    <Text style={styles.adminBtnText}>{t('reject', locale)}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={BaseColors.red500} />
          <Text style={styles.signOutText}>{t('signOut', locale)}</Text>
        </TouchableOpacity>
      </ScrollView>

      <ProfileEditor
        visible={activeEditor === 'profile'}
        onClose={() => setEditor(null)}
        onSave={(data: any) => updatePersonalInfo(data).then(success => success && setEditor(null))}
        isSaving={isSaving}
        initialData={user}
        theme={theme}
        colors={colors}
      />

      <PreferencesEditor
        visible={activeEditor === 'preferences'}
        onClose={() => setEditor(null)}
        onSave={(bibleVersion: any, reminderTime: string, enabled: boolean) =>
          updatePreferences(bibleVersion, reminderTime, enabled).then(success => success && setEditor(null))
        }
        isSaving={isSaving}
        initialData={user}
        notificationsEnabled={notificationsEnabled}
        theme={theme}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 20, padding: Spacing.xl },
  heroInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  heroName: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  editBtn: { marginTop: 8 },
  groupHeader: { fontSize: 12, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 1.2, marginHorizontal: Spacing.xl, marginTop: 32, marginBottom: 12 },
  card: { marginHorizontal: Spacing.xl, borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },
  adminSection: { marginTop: 12 },
  adminCard: { padding: 16, marginBottom: 12 },
  adminCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  viewProofBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8, borderRadius: Radius.md, backgroundColor: 'rgba(0,0,0,0.05)' },
  adminActions: { flexDirection: 'row', gap: 12 },
  adminBtn: { flex: 1, paddingVertical: 10, borderRadius: Radius.md, alignItems: 'center' },
  adminBtnText: { color: '#fff', fontWeight: 'bold' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 40, paddingVertical: 16 },
  signOutText: { color: BaseColors.red500, fontSize: 16, fontWeight: 'bold' },
});
