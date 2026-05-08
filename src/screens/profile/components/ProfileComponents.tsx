import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius, BaseColors } from '../../../constants/theme';
import HeaderBar from '../../../components/common/HeaderBar';

export const SettingRow = ({ icon, label, value, onPress, iconBg, iconColor, danger, toggle, toggleValue, onToggle, colors }: any) => (
  <TouchableOpacity
    style={[styles.row, { borderBottomColor: colors.border }]}
    onPress={onPress}
    disabled={!onPress && !toggle}
  >
    <View style={[styles.icon, { backgroundColor: iconBg || (colors.background === '#ffffff' ? '#f0f0f0' : colors.border) }]}>
      <Ionicons name={icon} size={16} color={danger ? BaseColors.red500 : (iconColor || colors.textSecondary)} />
    </View>
    <Text style={[styles.label, { color: danger ? BaseColors.red500 : colors.text }]}>{label}</Text>
    {toggle ? (
      <TouchableOpacity onPress={() => onToggle?.(!toggleValue)} style={[styles.toggle, { backgroundColor: toggleValue ? (iconColor || colors.text) : colors.border }]}>
        <View style={[styles.toggleThumb, { transform: [{ translateX: toggleValue ? 16 : 2 }] }]} />
      </TouchableOpacity>
    ) : value ? (
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: colors.textMuted }]}>{value}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    ) : !danger && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
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
  label: { flex: 1, fontSize: 16, fontWeight: '600' },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  value: { fontSize: 14 },
  toggle: { width: 40, height: 24, borderRadius: 12, padding: 2, justifyContent: 'center' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  guestContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'] },
  guestIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  guestTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  guestSubtitle: { textAlign: 'center', fontSize: 16, lineHeight: 22, marginBottom: 32 },
  primaryBtn: { width: '100%', paddingVertical: 16, borderRadius: Radius.md, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
