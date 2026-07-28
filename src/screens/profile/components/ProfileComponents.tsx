import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius, BaseColors } from '../../../constants/theme';
import HeaderBar from '../../../components/common/HeaderBar';

export const VerificationBadge = ({ verified, pending, colors }: any) => {
  if (verified) {
    return (
      <View style={[styles.badge, { backgroundColor: BaseColors.green100 }]}>
        <Ionicons name="checkmark-circle" size={12} color={BaseColors.green700} />
        <Text style={[styles.badgeText, { color: BaseColors.green700 }]}>Verified</Text>
      </View>
    );
  }
  if (pending) {
    return (
      <View style={[styles.badge, { backgroundColor: BaseColors.orange100 }]}>
        <Ionicons name="time" size={12} color={BaseColors.orange700} />
        <Text style={[styles.badgeText, { color: BaseColors.orange700 }]}>Pending</Text>
      </View>
    );
  }
  return null;
};

export const EditableAvatar = ({ uri, name, onEdit, isUploading, theme, colors }: any) => (
  <TouchableOpacity style={styles.avatarContainer} onPress={onEdit} disabled={isUploading}>
    <View style={[styles.avatar, { backgroundColor: theme.accent, borderColor: colors.background }]}>
      {uri ? (
        <Image source={{ uri }} style={styles.avatarImage} />
      ) : (
        <Text style={styles.avatarText}>{(name || 'G')[0]}</Text>
      )}
      {isUploading && (
        <View style={styles.uploadOverlay}>
          <ActivityIndicator color="#fff" />
        </View>
      )}
    </View>
    <View style={[styles.editBadge, { backgroundColor: theme.accent, borderColor: colors.background }]}>
      <Ionicons name="camera" size={12} color="#fff" />
    </View>
  </TouchableOpacity>
);

export const SettingRow = ({ icon, label, value, onPress, iconBg, iconColor, danger, toggle, toggleValue, onToggle, colors }: any) => (
  <TouchableOpacity
    style={[styles.row, { borderBottomColor: colors.border }]}
    onPress={onPress}
    disabled={!onPress && !toggle}
  >
    <View style={[styles.icon, { backgroundColor: iconBg || (colors.background === '#ffffff' ? '#f5f5f5' : colors.border) }]}>
      <Ionicons name={icon} size={18} color={danger ? BaseColors.red500 : (iconColor || colors.textSecondary)} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.label, { color: danger ? BaseColors.red500 : colors.text }]}>{label}</Text>
      {value && !toggle && <Text style={[styles.subLabel, { color: colors.textMuted }]}>{value}</Text>}
    </View>
    {toggle ? (
      <TouchableOpacity onPress={() => onToggle?.(!toggleValue)} style={[styles.toggle, { backgroundColor: toggleValue ? (iconColor || colors.text) : colors.border }]}>
        <View style={[styles.toggleThumb, { transform: [{ translateX: toggleValue ? 16 : 2 }] }]} />
      </TouchableOpacity>
    ) : (
      onPress && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    )}
  </TouchableOpacity>
);

export const GuestProfilePrompt = ({ theme, colors, onAuth }: any) => (
  <View style={{ flex: 1, backgroundColor: colors.background }}>
    <HeaderBar title="My Profile" showBack={false} enableBlur />
    <View style={styles.guestContent}>
      <View style={[styles.guestIcon, { backgroundColor: colors.border }]}>
        <Ionicons name="person-outline" size={40} color={colors.textSecondary} />
      </View>
      <Text style={[styles.guestTitle, { color: colors.text }]}>Complete your profile</Text>
      <Text style={[styles.guestSubtitle, { color: colors.textSecondary }]}>Create an account to save preferences and join the community.</Text>
      <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.accent }]} onPress={onAuth}>
        <Text style={styles.primaryBtnText}>Create account →</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: 14, borderBottomWidth: 1 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  label: { fontSize: 16, fontWeight: '600' },
  subLabel: { fontSize: 13, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  avatarContainer: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 3, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  uploadOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  toggle: { width: 40, height: 24, borderRadius: 12, padding: 2, justifyContent: 'center' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  guestContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'] },
  guestIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  guestTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  guestSubtitle: { textAlign: 'center', fontSize: 16, lineHeight: 22, marginBottom: 32 },
  primaryBtn: { width: '100%', paddingVertical: 16, borderRadius: Radius.md, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
