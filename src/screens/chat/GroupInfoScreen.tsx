// src/screens/chat/GroupInfoScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import HeaderBar from '../../components/common/HeaderBar';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useGroupMembers, GroupMember } from './hooks/useGroupMembers';
import { BaseColors, Typography, Spacing, Radius } from '../../constants/theme';
import { t, getDeviceLocale } from '../../services/locale';
import type { HomeStackParamList } from '../../types/navigation';

type GroupInfoRouteProp = RouteProp<HomeStackParamList, 'GroupInfo'>;

export default function GroupInfoScreen() {
  const navigation = useNavigation();
  const route = useRoute<GroupInfoRouteProp>();
  const locale = getDeviceLocale();
  const { groupId, groupName } = route.params;
  const { theme, colors } = useThemeStore();
  const { user: currentUser } = useAuthStore();
  const { members, isAdmin, makeAdmin, removeAdmin, isMakingAdmin, isRemovingAdmin } = useGroupMembers(groupId, theme.accent);

  const handleMemberAction = (member: GroupMember) => {
    if (!isAdmin || member.isYou) return;

    Alert.alert(
      member.name,
      t('areYouSureRemoveMember', locale),
      [
        { text: t('cancel', locale), style: 'cancel' },
        member.isAdmin ? (
          { text: t('removeAdmin', locale), style: 'destructive', onPress: () => removeAdmin(member.id) }
        ) : (
          { text: t('promoteToAdmin', locale), onPress: () => makeAdmin(member.id) }
        ),
        {
          text: t('removeFromGroup', locale),
          style: 'destructive',
          onPress: () => Alert.alert(
            t('confirm', locale),
            t('areYouSureRemoveMember', locale),
            [{ text: t('cancel', locale) }, { text: t('remove', locale), style: 'destructive' }]
          )
        }
      ]
    );
  };

  const renderMember = ({ item }: { item: GroupMember }) => (
    <TouchableOpacity
      style={[styles.memberRow, { borderBottomColor: colors.border }]}
      onPress={() => handleMemberAction(item)}
      disabled={!isAdmin || item.isYou}
    >
      <View style={[styles.avatar, { backgroundColor: item.color }]}>
        <Text style={styles.avatarText}>{item.initials}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: colors.text }]}>
          {item.name} {item.isYou && `(${t('you', locale)})`}
        </Text>
        {item.isAdmin && (
          <View style={[styles.adminBadge, { backgroundColor: theme.accentLight }]}>
            <Text style={[styles.adminBadgeText, { color: theme.accent }]}>{t('admin', locale)}</Text>
          </View>
        )}
      </View>
      {isAdmin && !item.isYou && (
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar
        title={t('groupInfo', locale)}
        subtitle={groupName}
        onBackPress={() => navigation.goBack()}
        enableBlur
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={[styles.groupIcon, { backgroundColor: theme.accent }]}>
            <Ionicons name="people" size={40} color="#fff" />
          </View>
          <Text style={[styles.groupTitle, { color: colors.text }]}>{groupName}</Text>
          <Text style={[styles.memberCount, { color: colors.textSecondary }]}>{members.length} {t('members', locale)}</Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.accent }]}>{t('members', locale)}</Text>
          {members.map(member => (
            <View key={member.id}>
              {renderMember({ item: member })}
            </View>
          ))}
        </View>

        {isAdmin && (
          <TouchableOpacity
            style={[styles.manageBtn, { backgroundColor: theme.accent }]}
            onPress={() => (navigation as any).navigate('ManageRequests', { groupId, groupName })}
          >
            <Ionicons name="person-add" size={20} color="#fff" />
            <Text style={styles.manageBtnText}>Manage Join Requests</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  header: { alignItems: 'center', paddingVertical: 40 },
  groupIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  groupTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  memberCount: { fontSize: 16, opacity: 0.6 },
  section: { marginHorizontal: Spacing.xl, borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: 'bold' },
  memberInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { fontSize: 16, fontWeight: '500' },
  adminBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  adminBadgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  manageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: Spacing.xl, paddingVertical: 14, borderRadius: Radius.lg },
  manageBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
