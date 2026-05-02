// src/screens/chat/ManageRequestsScreen.tsx
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import HeaderBar from '../../components/common/HeaderBar';
import { useThemeStore } from '../../store/themeStore';
import { useToastStore } from '../../store/toastStore';
import { getPendingJoinRequests, approveJoinRequest, rejectJoinRequest } from '../../services/chatGroups';
import { BaseColors, Typography, Spacing, Radius } from '../../constants/theme';
import type { HomeStackParamList } from '../../types/navigation';

type ManageRequestsRouteProp = RouteProp<HomeStackParamList, 'ManageRequests'>;

export default function ManageRequestsScreen() {
  const navigation = useNavigation();
  const route = useRoute<ManageRequestsRouteProp>();
  const { groupId, groupName } = route.params;
  const { colors, theme } = useThemeStore();
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ['pending-requests', groupId],
    queryFn: () => getPendingJoinRequests(groupId),
  });

  const approveMutation = useMutation({
    mutationFn: ({ requestId, userId }: { requestId: string; userId: string }) =>
      approveJoinRequest(requestId, groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-requests', groupId] });
      showToast({ title: 'Approved', message: 'The user has been added to the group.', variant: 'success' });
    },
    onError: (error: any) => {
      showToast({ title: 'Error', message: error.message || 'Failed to approve request', variant: 'error' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: string) => rejectJoinRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-requests', groupId] });
      showToast({ title: 'Rejected', message: 'The request has been declined.', variant: 'info' });
    },
    onError: (error: any) => {
      showToast({ title: 'Error', message: error.message || 'Failed to reject request', variant: 'error' });
    },
  });

  const renderRequestItem = ({ item }: { item: any }) => (
    <View style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.userInfo}>
        {item.profile.avatar_url ? (
          <Image source={{ uri: item.profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.accentLight }]}>
            <Text style={[styles.avatarText, { color: theme.accentDeep }]}>
              {item.profile.full_name?.charAt(0).toUpperCase() || 'M'}
            </Text>
          </View>
        )}
        <View style={styles.userDetails}>
          <Text style={[styles.userName, { color: colors.text }]}>{item.profile.full_name || 'Member'}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{item.profile.email}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.approveBtn, { backgroundColor: theme.accent }]}
          onPress={() => approveMutation.mutate({ requestId: item.id, userId: item.user_id })}
          disabled={approveMutation.isPending || rejectMutation.isPending}
        >
          {approveMutation.isPending ? (
            <ActivityIndicator size="small" color={BaseColors.white} />
          ) : (
            <Text style={styles.actionBtnText}>Approve</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn, { borderColor: BaseColors.red500 }]}
          onPress={() => rejectMutation.mutate(item.id)}
          disabled={approveMutation.isPending || rejectMutation.isPending}
        >
          {rejectMutation.isPending ? (
            <ActivityIndicator size="small" color={BaseColors.red500} />
          ) : (
            <Text style={[styles.actionBtnText, { color: BaseColors.red500 }]}>Decline</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar
        title="Join Requests"
        subtitle={groupName}
        onBackPress={() => navigation.goBack()}
        enableBlur={true}
      />
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No pending requests</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            All caught up! New requests to join this private group will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={isLoading}
          onRefresh={refetch}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  list: { padding: Spacing.xl },
  requestCard: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Typography.sansSemiBold, fontSize: 20 },
  userDetails: { marginLeft: Spacing.md, flex: 1 },
  userName: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.base },
  userEmail: { fontFamily: Typography.sans, fontSize: Typography.sizes.sm },
  actions: { flexDirection: 'row', gap: Spacing.md },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  approveBtn: {},
  rejectBtn: { borderWidth: 1 },
  actionBtnText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm, color: BaseColors.white },
  emptyTitle: { fontFamily: Typography.serif, fontSize: Typography.sizes.xl, marginTop: Spacing.lg },
  emptySub: { fontFamily: Typography.sans, fontSize: Typography.sizes.sm, textAlign: 'center', marginTop: Spacing.sm },
});
