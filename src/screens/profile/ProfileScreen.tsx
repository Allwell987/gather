// src/screens/profile/ProfileScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import HeaderBar from '../../components/common/HeaderBar';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { BaseColors, Spacing, Radius, CHURCH } from '../../constants/theme';
import { useProfile } from './hooks/useProfile';
import { useAdminVerification } from './hooks/useAdminVerification';
import { SettingRow, GuestProfilePrompt } from './components/ProfileComponents';
import { ProfileEditor } from './components/ProfileModals';
import type { ProfileScreenNavigationProp } from '../../types/navigation';

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { theme, colors, themeMode } = useThemeStore();
  const { setIsGuest } = useAuthStore();
  const { user, isSaving, hasPendingVerification, updatePersonalInfo, handleSignOut } = useProfile();
  const { requests, reviewRequest, openCertificate } = useAdminVerification(user?.role === 'admin');

  const [activeEditor, setEditor] = useState<string | null>(null);

  if (!user) return <GuestProfilePrompt theme={theme} colors={colors} onAuth={() => setIsGuest(false)} />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar title="My Profile" showBack={false} rightIcon="pencil" rightAction={() => setEditor('profile')} enableBlur />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
            <Text style={styles.avatarText}>{(user.full_name || 'G')[0]}</Text>
          </View>
          <View>
            <Text style={styles.heroName}>{user.full_name}</Text>
            <Text style={{ color: theme.accentBorder }}>{CHURCH.name}</Text>
          </View>
        </View>

        <Text style={[styles.groupHeader, { color: colors.text }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="person-outline" label="Personal details" value={user.full_name} onPress={() => setEditor('profile')} colors={colors} />
          <SettingRow icon="color-palette-outline" label="Theme" value={theme.name} onPress={() => navigation.navigate('ThemePicker', { fromOnboarding: false })} colors={colors} iconColor={theme.accent} />
          <SettingRow icon="moon-outline" label="Appearance" value={themeMode} onPress={() => {}} colors={colors} />
          <SettingRow icon="log-out-outline" label="Sign out" danger onPress={handleSignOut} colors={colors} />
        </View>

        {requests.length > 0 && (
          <View style={styles.adminSection}>
            <Text style={[styles.groupHeader, { color: colors.text }]}>Admin: Pending Verification</Text>
            {requests.map(r => (
              <View key={r.id} style={[styles.card, { padding: 16, backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>{r.profile.full_name}</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                  <TouchableOpacity onPress={() => openCertificate(r)}><Text style={{ color: theme.accent }}>View Proof</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => reviewRequest(r, 'approved')}><Text style={{ color: 'green' }}>Approve</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => reviewRequest(r, 'rejected')}><Text style={{ color: 'red' }}>Reject</Text></TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 20, padding: Spacing.xl, backgroundColor: BaseColors.brown900 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  heroName: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  groupHeader: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginHorizontal: Spacing.xl, marginTop: 24, marginBottom: 8 },
  card: { marginHorizontal: Spacing.xl, borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },
  adminSection: { marginTop: 12 },
});
