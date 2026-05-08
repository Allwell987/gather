import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../services/supabase';
import {
  addGroupMember,
  addGroupAdmin,
  removeGroupAdmin,
  searchProfilesForGroupInvite,
  getGroupAdminIds,
  logGroupAdminAction,
  type GroupMemberProfile,
  type GroupAdminAuditAction
} from '../../../services/chatGroups';
import { useToastStore } from '../../../store/toastStore';
import { useAuthStore } from '../../../store/authStore';
import type { Profile, ProfileRole } from '../../../types/database';

export interface GroupMember {
  id: string;
  name: string;
  initials: string;
  color: string;
  verificationLevel: 'none' | 'gold' | 'black';
  isYou?: boolean;
  isAdmin?: boolean;
}

const getVerificationLevel = (
  role?: ProfileRole | string | null,
  isVerified?: boolean | null,
): 'none' | 'gold' | 'black' => {
  if (role === 'pastor' || role === 'admin') return 'black';
  if (isVerified) return 'gold';
  return 'none';
};

const getDisplayInitials = (name?: string | null) => {
  return name
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'U';
};

const getDisplayColor = (name: string, accentColor: string, isCurrentUser: boolean) => {
  if (isCurrentUser) return accentColor;
  const colorPalette = ['#075E54', '#128C7E', '#25D366', '#34B7F1', '#E50914', '#F4B400', '#DB4437'];
  const nameHash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colorPalette[nameHash % colorPalette.length];
};

export function useGroupMembers(groupId: string, accentColor: string) {
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();

  const { data: adminIds = [] } = useQuery({
    queryKey: ['chat-group-admins', groupId],
    queryFn: () => getGroupAdminIds(groupId),
  });

  const adminSet = useMemo(() => new Set(adminIds), [adminIds]);
  const isUserAdmin = user?.id ? adminSet.has(user.id) : false;

  const { data: explicitMembers = [] } = useQuery({
    queryKey: ['chat-group-members', groupId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_group_members')
        .select('user_id, profiles:user_id(full_name, is_verified, role)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .returns<{
          user_id: string;
          profiles: Pick<Profile, 'full_name' | 'is_verified' | 'role'> | null;
        }[]>();

      if (error) return [];

      return (data ?? []).map((member) => {
        const memberName = member.profiles?.full_name?.trim() || 'Unknown';
        const isCurrentUser = member.user_id === user?.id;

        return {
          id: member.user_id,
          name: memberName,
          initials: getDisplayInitials(memberName),
          color: getDisplayColor(memberName, accentColor, isCurrentUser),
          verificationLevel: getVerificationLevel(member.profiles?.role, member.profiles?.is_verified),
          isYou: isCurrentUser,
          isAdmin: adminSet.has(member.user_id),
        } as GroupMember;
      });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (memberUserId: string) => addGroupMember(groupId, memberUserId),
    onSuccess: async (_data, memberUserId) => {
      await queryClient.invalidateQueries({ queryKey: ['chat-group-members', groupId] });
      if (user?.id) {
        await logGroupAdminAction({
          groupId,
          actorUserId: user.id,
          action: 'member_added',
          targetUserId: memberUserId,
        });
      }
      showToast({ title: 'Member added', message: 'User joined successfully.', variant: 'success' });
    },
    onError: (error) => showToast({ title: 'Failed', message: error.message, variant: 'error' }),
  });

  const makeAdminMutation = useMutation({
    mutationFn: (memberUserId: string) => addGroupAdmin(groupId, memberUserId),
    onSuccess: async (_data, memberUserId) => {
      await queryClient.invalidateQueries({ queryKey: ['chat-group-admins', groupId] });
      if (user?.id) {
        await logGroupAdminAction({
          groupId,
          actorUserId: user.id,
          action: 'admin_granted',
          targetUserId: memberUserId,
        });
      }
      showToast({ title: 'Admin granted', message: 'Member is now an admin.', variant: 'success' });
    },
  });

  const removeAdminMutation = useMutation({
    mutationFn: (memberUserId: string) => removeGroupAdmin(groupId, memberUserId),
    onSuccess: async (_data, memberUserId) => {
      await queryClient.invalidateQueries({ queryKey: ['chat-group-admins', groupId] });
      if (user?.id) {
        await logGroupAdminAction({
          groupId,
          actorUserId: user.id,
          action: 'admin_removed',
          targetUserId: memberUserId,
        });
      }
      showToast({ title: 'Admin removed', message: 'Privileges revoked.', variant: 'success' });
    },
  });

  return {
    members: explicitMembers,
    isAdmin: isUserAdmin,
    adminCount: adminSet.size,
    addMember: addMemberMutation.mutate,
    isAdding: addMemberMutation.isPending,
    makeAdmin: makeAdminMutation.mutate,
    isMakingAdmin: makeAdminMutation.isPending,
    removeAdmin: removeAdminMutation.mutate,
    isRemovingAdmin: removeAdminMutation.isPending,
    adminIds: adminIds,
  };
}
