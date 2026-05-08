// src/screens/community/CommunityScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View, Linking, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HeaderBar from '../../components/common/HeaderBar';
import { useThemeStore } from '../../store/themeStore';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { BaseColors, Typography, Spacing, Radius, CHURCH } from '../../constants/theme';
import EmptyState from '../../components/common/EmptyState';
import PrayerWallScreen from '../prayer/PrayerWallScreen';
import EventsScreen from '../events/EventsScreen';
import { useLiveStatus } from '../../hooks/useLiveStatus';
import { useCommunityGroups } from './hooks/useCommunityGroups';
import { GroupCard } from './components/GroupCard';
import type { CommunityScreenNavigationProp } from '../../types/navigation';

type CommunityTab = 'Wall' | 'Events' | 'Groups';

export default function CommunityScreen() {
  const navigation = useNavigation<CommunityScreenNavigationProp>();
  const { user } = useAuthStore();
  const { theme, colors } = useThemeStore();
  const [activeTab, setActiveTab] = useState<CommunityTab>('Wall');
  const [searchQuery, setSearchQuery] = useState('');

  const { isLive, activeLive } = useLiveStatus();
  const { groups, isLoading, joinedSet, pendingSet, join, request, isJoining, isRequesting, joinVariables, requestVariables, refetch } = useCommunityGroups(user?.id ?? null);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(g => g.name.toLowerCase().includes(q) || (g.description?.toLowerCase().includes(q) ?? false));
  }, [groups, searchQuery]);

  const handleJoinLive = () => {
    if (activeLive?.live_url) Linking.openURL(activeLive.live_url).catch(() => Alert.alert('Error', 'Could not open stream.'));
  };

  const renderGroups = () => (
    <ScrollView contentContainerStyle={styles.groupsList} showsVerticalScrollIndicator={false}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search groups..." placeholderTextColor={colors.textMuted} style={{ flex: 1, color: colors.text }} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
      ) : filteredGroups.length === 0 ? (
        <EmptyState title="No groups found" description="Try a different search." />
      ) : filteredGroups.map(group => (
        <GroupCard
          key={group.id}
          group={group}
          isMember={joinedSet.has(group.id)}
          isPending={pendingSet.has(group.id)}
          onPress={() => navigation.navigate('HomeTab', { screen: 'GroupChat', params: { groupId: group.id, groupName: group.name } })}
          onJoin={() => join(group.id)}
          onRequest={() => request(group.id)}
          isJoining={isJoining && joinVariables === group.id}
          isRequesting={isRequesting && requestVariables === group.id}
          colors={colors}
          theme={theme}
        />
      ))}
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar title="Community" subtitle={CHURCH.name} enableBlur showBack={false} />

      <View style={styles.tabBar}>
        {['Wall', 'Events', 'Groups'].map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && { backgroundColor: theme.accent }]} onPress={() => setActiveTab(tab as CommunityTab)}>
            <Text style={[styles.tabText, activeTab !== tab && { color: 'rgba(255,255,255,0.6)' }]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        {isLive && (
          <TouchableOpacity style={[styles.liveBanner, { backgroundColor: theme.accent }]} onPress={handleJoinLive}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>LIVE: {activeLive?.title}</Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </TouchableOpacity>
        )}
        {activeTab === 'Wall' ? <PrayerWallScreen hideHeader /> : activeTab === 'Events' ? <EventsScreen hideHeader /> : renderGroups()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { flexDirection: 'row', backgroundColor: BaseColors.brown900, padding: 8, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Radius.full },
  tabText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  groupsList: { padding: Spacing.xl },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 20 },
  liveBanner: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, alignItems: 'center' },
});
