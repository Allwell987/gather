// src/services/chatGroups.ts
import { supabase } from './supabase';
import type { ChatGroup, ChatGroupJoinRequest, ChatGroupJoinRequestWithProfile } from '../types/database';

export interface GroupMemberProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

export type GroupAdminAuditAction =
  | 'group_settings_updated'
  | 'join_request_approved'
  | 'join_request_rejected'
  | 'member_added'
  | 'admin_granted'
  | 'admin_removed';

export interface CreateChatGroupInput {
  id?: string;
  name: string;
  createdBy: string;
  description?: string | null;
  displayPictureUrl?: string | null;
  emoji?: string | null;
  isPrivate?: boolean;
}

const slugifyGroupName = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 42);

export const generateChatGroupId = (name: string) => {
  const slug = slugifyGroupName(name) || 'group';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${slug}-${suffix}`;
};

export const listChatGroups = async (): Promise<ChatGroup[]> => {
  const { data, error } = await supabase
    .from('chat_groups')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const getUserJoinedGroupIds = async (userId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('chat_group_members')
    .select('group_id')
    .eq('user_id', userId)
    .returns<{ group_id: string }[]>();

  if (error) throw error;
  return (data || []).map((r) => r.group_id);
};

export const getUserPendingRequestGroupIds = async (userId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('chat_group_join_requests')
    .select('group_id')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .returns<{ group_id: string }[]>();

  if (error) throw error;
  return (data || []).map((r) => r.group_id);
};

export const getGroupAdminIds = async (groupId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('chat_group_admins')
    .select('user_id')
    .eq('group_id', groupId)
    .returns<{ user_id: string }[]>();

  if (error) throw error;
  return (data || []).map((row) => row.user_id);
};

export const addGroupAdmin = async (groupId: string, userId: string) => {
  const { error } = await supabase
    .from('chat_group_admins')
    .insert({
      group_id: groupId,
      user_id: userId,
    } as never);

  if (error) throw error;
};

export const removeGroupAdmin = async (groupId: string, userId: string) => {
  const { error } = await supabase
    .from('chat_group_admins')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) throw error;
};

export const addGroupMember = async (groupId: string, userId: string) => {
  const { error } = await supabase
    .from('chat_group_members')
    .insert({
      group_id: groupId,
      user_id: userId,
    } as never);

  if (error) throw error;
};

export const searchProfilesForGroupInvite = async (
  query: string,
  excludedUserIds: string[],
): Promise<GroupMemberProfile[]> => {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) {
    return [];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, email')
    .or(`full_name.ilike.%${trimmedQuery}%,email.ilike.%${trimmedQuery}%`)
    .order('full_name', { ascending: true })
    .limit(20);

  if (error) throw error;

  const excludedSet = new Set(excludedUserIds);
  return ((data as any) || []).filter((profile: any) => !excludedSet.has(profile.id));
};

export const logGroupAdminAction = async ({
  groupId,
  actorUserId,
  action,
  targetUserId,
  metadata,
}: {
  groupId: string;
  actorUserId: string;
  action: GroupAdminAuditAction;
  targetUserId?: string | null;
  metadata?: Record<string, unknown>;
}) => {
  const { error } = await supabase
    .from('chat_group_admin_audit_logs')
    .insert({
      group_id: groupId,
      actor_user_id: actorUserId,
      action,
      target_user_id: targetUserId ?? null,
      metadata: metadata ?? {},
    } as never);

  if (error) throw error;
};

export const createChatGroup = async ({
  id,
  name,
  createdBy,
  description,
  displayPictureUrl,
  emoji,
  isPrivate = false,
}: CreateChatGroupInput): Promise<ChatGroup> => {
  const groupId = id ?? generateChatGroupId(name);

  const { data, error } = await supabase
    .from('chat_groups')
    .insert({
      id: groupId,
      name: name.trim(),
      description: description?.trim() || null,
      display_picture_url: displayPictureUrl?.trim() || null,
      emoji: emoji?.trim() || '👥',
      is_private: isPrivate,
      created_by: createdBy,
      member_count: 1,
    } as never)
    .select('id, name, emoji, description, display_picture_url, created_by, member_count, is_private, created_at, updated_at')
    .returns<ChatGroup>()
    .single();

  if (error) throw error;

  const { error: memberError } = await supabase
    .from('chat_group_members')
    .insert({
      group_id: groupId,
      user_id: createdBy,
    } as never);

  if (memberError) throw memberError;

  return data;
};

/**
 * Create a join request for a private group
 * @param groupId - The ID of the group to request to join
 * @param userId - The ID of the user requesting to join
 * @returns The created join request or null if it already exists
 */
export const createJoinRequest = async (groupId: string, userId: string) => {
  const { data, error } = await supabase
    .from('chat_group_join_requests')
    .insert({
      group_id: groupId,
      user_id: userId,
      status: 'pending',
    } as never)
    .select()
    .returns<ChatGroupJoinRequest>()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Get pending join requests for a group (for group creator)
 * @param groupId - The ID of the group
 * @returns Array of pending join requests with user profiles
 */
export const getPendingJoinRequests = async (
  groupId: string
): Promise<ChatGroupJoinRequestWithProfile[]> => {
  const { data, error } = await supabase
    .from('chat_group_join_requests')
    .select(
      `
      *,
      profile:user_id(full_name, avatar_url, email)
    `
    )
    .eq('group_id', groupId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .returns<ChatGroupJoinRequestWithProfile[]>();

  if (error) throw error;
  return data || [];
};

/**
 * Get all join requests for a group (for group creator)
 * @param groupId - The ID of the group
 * @returns Array of join requests with user profiles
 */
export const getAllJoinRequests = async (
  groupId: string
): Promise<ChatGroupJoinRequestWithProfile[]> => {
  const { data, error } = await supabase
    .from('chat_group_join_requests')
    .select(
      `
      *,
      profile:user_id(full_name, avatar_url, email)
    `
    )
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .returns<ChatGroupJoinRequestWithProfile[]>();

  if (error) throw error;
  return data || [];
};

/**
 * Get join request status for a user
 * @param groupId - The ID of the group
 * @param userId - The ID of the user
 * @returns The join request object or null if not found
 */
export const getJoinRequestStatus = async (
  groupId: string,
  userId: string
): Promise<ChatGroupJoinRequest | null> => {
  const { data, error } = await supabase
    .from('chat_group_join_requests')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .returns<ChatGroupJoinRequest>()
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "no rows returned" which is expected if no request exists
    throw error;
  }

  return data || null;
};

/**
 * Approve a join request and add user to group members
 * @param requestId - The ID of the join request
 * @param groupId - The ID of the group
 * @param userId - The ID of the user
 */
export const approveJoinRequest = async (
  requestId: string,
  groupId: string,
  userId: string
) => {
  // Update request status
  const { error: updateError } = await supabase
    .from('chat_group_join_requests')
    .update({ status: 'approved' } as never)
    .eq('id', requestId);

  if (updateError) throw updateError;

  // Add user to group members
  const { error: insertError } = await supabase
    .from('chat_group_members')
    .insert({
      group_id: groupId,
      user_id: userId,
    } as never);

  if (insertError) throw insertError;
};

/**
 * Reject a join request
 * @param requestId - The ID of the join request
 */
export const rejectJoinRequest = async (requestId: string) => {
  const { error } = await supabase
    .from('chat_group_join_requests')
    .update({ status: 'rejected' } as never)
    .eq('id', requestId);

  if (error) throw error;
};

/**
 * Cancel a join request (by the user who made it)
 * @param requestId - The ID of the join request
 */
export const cancelJoinRequest = async (requestId: string) => {
  const { error } = await supabase
    .from('chat_group_join_requests')
    .delete()
    .eq('id', requestId);

  if (error) throw error;
};

/**
 * Check if a group requires join approval (is private)
 * @param groupId - The ID of the group
 * @returns True if the group is private, false otherwise
 */
export const isPrivateGroup = async (groupId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('chat_groups')
    .select('is_private')
    .eq('id', groupId)
    .returns<{ is_private: boolean }>()
    .single();

  if (error) throw error;
  return (data as any)?.is_private || false;
};

/**
 * Check if user is member of a group
 * @param groupId - The ID of the group
 * @param userId - The ID of the user
 * @returns True if user is a member, false otherwise
 */
export const isGroupMember = async (groupId: string, userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('chat_group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .returns<{ id: string }>()
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return !!data;
};

/**
 * Join a public group directly
 * @param groupId - The ID of the group
 * @param userId - The ID of the user
 */
export const joinPublicGroup = async (groupId: string, userId: string) => {
  const { error } = await supabase
    .from('chat_group_members')
    .insert({
      group_id: groupId,
      user_id: userId,
    } as never);

  if (error) throw error;
};

/**
 * Leave a group
 * @param groupId - The ID of the group
 * @param userId - The ID of the user
 */
export const leaveGroup = async (groupId: string, userId: string) => {
  const { error } = await supabase
    .from('chat_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) throw error;
};

