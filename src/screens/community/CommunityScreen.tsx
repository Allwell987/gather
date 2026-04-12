// src/screens/community/CommunityScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../store/themeStore';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { BaseColors, Typography, Spacing, Radius } from '../../constants/theme';
import EmptyState from '../../components/common/EmptyState';
import PrayerWallScreen from '../prayer/PrayerWallScreen';
import EventsScreen from '../events/EventsScreen';
import {
  createJoinRequest,
  getUserJoinedGroupIds,
  getUserPendingRequestGroupIds,
  joinPublicGroup,
  listChatGroups,
} from '../../services/chatGroups';
import type { CommunityScreenNavigationProp } from '../../types/navigation';

type CommunityTab = 'Wall' | 'Events' | 'Groups';

export default function CommunityScreen() {
  const navigation = useNavigation<CommunityScreenNavigationProp>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { theme, colors } = useThemeStore();
  const { showToast } = useToastStore();
  const [activeTab, setActiveTab] = useState<CommunityTab>('Wall');
  const [searchQuery, setSearchQuery] = useState('');

  const userId = user?.id ?? null;

  const {
    data: groups = [],
    isLoading: isGroupsLoading,
    isRefetching: isGroupsRefetching,
    isError: hasGroupsError,
    refetch: refetchGroups,
  } = useQuery({
    queryKey: ['community-chat-groups'],
    queryFn: listChatGroups,
  });

  const { data: joinedGroupIds = [] } = useQuery({
    queryKey: ['user-joined-group-ids', userId],
    queryFn: () => getUserJoinedGroupIds(userId!),
    enabled: Boolean(userId),
  });

  const { data: pendingGroupIds = [] } = useQuery({
    queryKey: ['user-pending-request-group-ids', userId],
    queryFn: () => getUserPendingRequestGroupIds(userId!),
    enabled: Boolean(userId),
  });

  const joinedSet = useMemo(() => new Set(joinedGroupIds), [joinedGroupIds]);
  const pendingSet = useMemo(() => new Set(pendingGroupIds), [pendingGroupIds]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.description?.toLowerCase().includes(q) ?? false),
    );
  }, [groups, searchQuery]);

  const joinMutation = useMutation({
    mutationFn: ({ groupId }: { groupId: string }) => joinPublicGroup(groupId, userId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user-joined-group-ids', userId] });
      void queryClient.invalidateQueries({ queryKey: ['community-chat-groups'] });
      showToast({ title: 'Joined', message: 'You are now a member of this fellowship.', variant: 'success' });
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      const lower = msg.toLowerCase();
      showToast({
        title: 'Could not join',
        message: lower.includes('row-level security') || lower.includes('permission')
          ? 'You do not have permission to join this group.'
          : msg,
        variant: 'error',
      });
    },
  });

  const requestMutation = useMutation({
    mutationFn: ({ groupId }: { groupId: string }) => createJoinRequest(groupId, userId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user-pending-request-group-ids', userId] });
      showToast({ title: 'Request sent', message: 'The group owner will review your request.', variant: 'success' });
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      const lower = msg.toLowerCase();
      showToast({
        title: 'Could not request',
        message: lower.includes('unique') || lower.includes('duplicate')
          ? 'You already have a pending request for this group.'
          : msg,
        variant: 'error',
      });
    },
  });

  const renderGroupAction = (groupId: string, isPrivate: boolean) => {
    if (!userId) return null;

    if (joinedSet.has(groupId)) {
      return (
        <View style={[styles.memberBadge, { backgroundColor: theme.accentSubtle }]}>
          <Ionicons name="checkmark-circle" size={14} color={theme.accentDeep} />
          <Text style={[styles.memberBadgeText, { color: theme.accentDeep }]}>Joined</Text>
        </View>
      );
    }

    if (isPrivate) {
      if (pendingSet.has(groupId)) {
        return (
          <View style={[styles.memberBadge, { backgroundColor: BaseColors.warm100, borderColor: BaseColors.brown200 }]}>
            <Ionicons name="time-outline" size={14} color={BaseColors.brown700} />
            <Text style={[styles.memberBadgeText, { color: BaseColors.brown700 }]}>Pending</Text>
          </View>
        );
      }
      const isThisRequesting = requestMutation.isPending && requestMutation.variables?.groupId === groupId;
      return (
        <TouchableOpacity
          style={[styles.joinButton, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => requestMutation.mutate({ groupId })}
          activeOpacity={0.8}
          disabled={isThisRequesting}
        >
          {isThisRequesting ? (
            <ActivityIndicator size="small" color={theme.accent} />
          ) : (
            <>
              <Ionicons name="lock-closed-outline" size={13} color={theme.accent} />
              <Text style={[styles.joinButtonText, { color: theme.accent }]}>Request</Text>
            </>
          )}
        </TouchableOpacity>
      );
    }

    const isThisJoining = joinMutation.isPending && joinMutation.variables?.groupId === groupId;
    return (
      <TouchableOpacity
        style={[styles.joinButton, { backgroundColor: theme.accent }]}
        onPress={() => joinMutation.mutate({ groupId })}
        activeOpacity={0.8}
        disabled={isThisJoining}
      >
        {isThisJoining ? (
          <ActivityIndicator size="small" color={BaseColors.white} />
        ) : (
          <>
            <Ionicons name="enter-outline" size={13} color={BaseColors.white} />
            <Text style={[styles.joinButtonText, { color: BaseColors.white }]}>Join</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const renderGroups = () => (
    <ScrollView contentContainerStyle={styles.groupsList} showsVerticalScrollIndicator={false}>
      <View style={styles.groupsHeaderRow}>
        <View style={styles.groupsHeaderCopy}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Fellowships</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Browse church groups or start one with its picture and about already in place.</Text>
        </View>
        <TouchableOpacity
          style={[styles.createGroupButton, { backgroundColor: theme.accent }]}
          onPress={() => navigation.navigate('CreateGroup')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color={BaseColors.white} />
          <Text style={styles.createGroupButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search groups..."
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.text }]}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {isGroupsLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={theme.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading fellowships...</Text>
        </View>
      ) : hasGroupsError ? (
        <EmptyState
          emoji="⚠️"
          title="We could not load groups"
          description="Check your connection and try again."
          style={styles.emptyState}
          action={(
            <TouchableOpacity
              style={[styles.retryButton, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => void refetchGroups()}
              activeOpacity={0.8}
            >
              <Text style={[styles.retryButtonText, { color: colors.text }]}>Try again</Text>
            </TouchableOpacity>
          )}
        />
      ) : filteredGroups.length === 0 ? (
        searchQuery.trim().length > 0 ? (
          <EmptyState
            emoji="🔍"
            title="No groups matched"
            description={`No fellowships matched "${searchQuery.trim()}". Try a different term.`}
            style={styles.emptyState}
          />
        ) : (
          <EmptyState
            emoji="👥"
            title="No groups yet"
            description="Create the first fellowship for this community."
            style={styles.emptyState}
            action={(
              <TouchableOpacity
                style={[styles.emptyActionButton, { backgroundColor: theme.accent }]}
                onPress={() => navigation.navigate('CreateGroup')}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyActionText}>Create group</Text>
              </TouchableOpacity>
            )}
          />
        )
      ) : (
        filteredGroups.map((group) => {
          const isMember = joinedSet.has(group.id);
          return (
            <TouchableOpacity
              key={group.id}
              style={[styles.groupItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={isMember ? () => navigation.navigate('HomeTab', { screen: 'GroupChat', params: { groupId: group.id, groupName: group.name } }) : undefined}
              activeOpacity={isMember ? 0.75 : 1}
            >
              {group.display_picture_url ? (
                <Image source={{ uri: group.display_picture_url }} style={styles.groupImage} />
              ) : (
                <View style={[styles.groupIcon, { backgroundColor: colors.background }]}>
                  <Text style={styles.groupEmoji}>{group.emoji || '👥'}</Text>
                </View>
              )}

              <View style={styles.groupInfo}>
                <View style={styles.groupTitleRow}>
                  <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>{group.name}</Text>
                  <View style={[
                    styles.groupVisibility,
                    { backgroundColor: group.is_private ? BaseColors.warm100 : theme.accentSubtle },
                  ]}>
                    <Ionicons
                      name={group.is_private ? 'lock-closed-outline' : 'globe-outline'}
                      size={12}
                      color={group.is_private ? BaseColors.brown700 : theme.accentDeep}
                    />
                    <Text style={[
                      styles.groupVisibilityText,
                      { color: group.is_private ? BaseColors.brown700 : theme.accentDeep },
                    ]}>
                      {group.is_private ? 'Private' : 'Public'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.groupSub, { color: colors.textSecondary }]} numberOfLines={2}>
                  {group.description?.trim() || 'No group about yet.'}
                </Text>
              </View>

              {renderGroupAction(group.id, group.is_private)}
            </TouchableOpacity>
          );
        })
      )}

      {isGroupsRefetching && !isGroupsLoading ? (
        <Text style={[styles.refreshingText, { color: colors.textMuted }]}>Refreshing groups...</Text>
      ) : null}

      <TouchableOpacity style={styles.exploreBtn} onPress={() => void refetchGroups()} activeOpacity={0.8}>
        <Text style={[styles.exploreBtnText, { color: theme.accent }]}>Refresh fellowships</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: BaseColors.brown900 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Community</Text>
          <View style={[styles.tabContainer, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'Wall' && { backgroundColor: theme.accent }]}
              onPress={() => setActiveTab('Wall')}
            >
              <Text style={[styles.tabText, activeTab !== 'Wall' && { color: 'rgba(255,255,255,0.6)' }]}>Wall</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'Events' && { backgroundColor: theme.accent }]}
              onPress={() => setActiveTab('Events')}
            >
              <Text style={[styles.tabText, activeTab !== 'Events' && { color: 'rgba(255,255,255,0.6)' }]}>Events</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'Groups' && { backgroundColor: theme.accent }]}
              onPress={() => setActiveTab('Groups')}
            >
              <Text style={[styles.tabText, activeTab !== 'Groups' && { color: 'rgba(255,255,255,0.6)' }]}>Groups</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <View style={{ flex: 1 }}>
        {activeTab === 'Wall' ? (
          <PrayerWallScreen />
        ) : activeTab === 'Events' ? (
          <EventsScreen />
        ) : (
          renderGroups()
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerTitle: {
    fontFamily: Typography.serif,
    fontSize: Typography.sizes.xl,
    color: BaseColors.white,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: Radius.full,
    padding: 4,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  tabText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.xs,
    letterSpacing: 0.4,
    color: BaseColors.white,
  },
  groupsList: { padding: Spacing.xl, gap: Spacing.md },
  groupsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  groupsHeaderCopy: { flex: 1, gap: 4 },
  sectionTitle: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.md, letterSpacing: 0.2 },
  sectionSubtitle: { fontFamily: Typography.sans, fontSize: Typography.sizes.sm, lineHeight: 18 },
  createGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  createGroupButtonText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.sm,
    color: BaseColors.white,
  },
  loadingWrap: { alignItems: 'center', paddingVertical: Spacing['2xl'], gap: Spacing.sm },
  loadingText: { fontFamily: Typography.sans, fontSize: Typography.sizes.sm },
  emptyState: { paddingVertical: Spacing['2xl'] },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  retryButtonText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm },
  emptyActionButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  emptyActionText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm, color: BaseColors.white },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.md,
    shadowColor: BaseColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  groupIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupImage: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: BaseColors.brown100,
  },
  groupEmoji: { fontSize: 24 },
  groupInfo: { flex: 1, gap: 6 },
  groupTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  groupName: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.md },
  groupSub: { fontFamily: Typography.sans, fontSize: 11, lineHeight: 16 },
  groupVisibility: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  groupVisibilityText: { fontFamily: Typography.sansSemiBold, fontSize: 10 },
  refreshingText: { textAlign: 'center', fontFamily: Typography.sans, fontSize: Typography.sizes.xs },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.base,
    padding: 0,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  memberBadgeText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.xs,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: Radius.full,
    borderWidth: 1,
    minWidth: 74,
    justifyContent: 'center',
  },
  joinButtonText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.xs,
  },
  exploreBtn: { marginTop: Spacing.md, alignItems: 'center' },
  exploreBtnText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.xs, letterSpacing: 0.4, textTransform: 'uppercase' },
});
