import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listChatGroups,
  getUserJoinedGroupIds,
  getUserPendingRequestGroupIds,
  joinPublicGroup,
  createJoinRequest
} from '../../../services/chatGroups';
import { useToastStore } from '../../../store/toastStore';
import { getFriendlyErrorMessage } from '../../../services/errorMapping';

export function useCommunityGroups(userId: string | null) {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();

  const { data: groups = [], isLoading, isRefetching, error, refetch } = useQuery({
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

  const joinGroup = useMutation({
    mutationFn: (groupId: string) => joinPublicGroup(groupId, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-joined-group-ids'] });
      showToast({ title: 'Joined', message: 'You are now a member.', variant: 'success' });
    },
    onError: (err) => {
      showToast({ title: 'Join failed', message: getFriendlyErrorMessage(err), variant: 'error' });
    }
  });

  const requestJoin = useMutation({
    mutationFn: (groupId: string) => createJoinRequest(groupId, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-pending-request-group-ids'] });
      showToast({ title: 'Requested', message: 'Request sent to admin.', variant: 'success' });
    },
    onError: (err) => {
      showToast({ title: 'Request failed', message: getFriendlyErrorMessage(err), variant: 'error' });
    }
  });

  return {
    groups,
    isLoading,
    isRefetching,
    error,
    refetch,
    joinedSet,
    pendingSet,
    join: joinGroup.mutate,
    isJoining: joinGroup.isPending,
    request: requestJoin.mutate,
    isRequesting: requestJoin.isPending,
    joinVariables: joinGroup.variables,
    requestVariables: requestJoin.variables,
  };
}
