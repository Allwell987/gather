// src/services/chatMessages.ts
import { supabase } from './supabase';
import type { Database } from '../types/database';

export type MessageRow = Database['public']['Tables']['messages']['Row'] & {
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
    role: string | null;
  } | null;
  message_reactions?: { user_id: string; reaction: string }[];
  message_reads?: { user_id: string }[];
};

export const listMessages = async (groupId: string): Promise<MessageRow[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      profiles:user_id (full_name, avatar_url, is_verified, role),
      message_reactions(user_id, reaction),
      message_reads(user_id)
    `)
    .eq('group_id', groupId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .returns<MessageRow[]>();

  if (error) throw error;
  return data || [];
};

export const sendMessage = async (
  groupId: string,
  userId: string,
  content: string,
  replyToMessageId?: string | null
) => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      group_id: groupId,
      user_id: userId,
      content,
      reply_to_message_id: replyToMessageId ?? null,
    } as never)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const toggleReaction = async (
  messageId: string,
  userId: string,
  reaction: string
) => {
  const { data: existing, error: fetchError } = await supabase
    .from('message_reactions')
    .select('id, reaction')
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .returns<{ id: string; reaction: string }>()
    .maybeSingle();

  if (fetchError) throw fetchError;

  const existingData = existing as { id: string; reaction: string } | null;

  if (existingData && existingData.reaction === reaction) {
    const { error: deleteError } = await supabase
      .from('message_reactions')
      .delete()
      .eq('id', existingData.id);
    if (deleteError) throw deleteError;
    return { action: 'removed' };
  }

  if (existingData) {
    const { error: updateError } = await supabase
      .from('message_reactions')
      .update({ reaction } as never)
      .eq('id', existingData.id);
    if (updateError) throw updateError;
    return { action: 'updated' };
  }

  const { error: insertError } = await supabase
    .from('message_reactions')
    .insert({
      message_id: messageId,
      user_id: userId,
      reaction,
    } as never);
  if (insertError) throw insertError;
  return { action: 'added' };
};

export const markMessagesAsRead = async (messageIds: string[], userId: string) => {
  if (messageIds.length === 0) return;

  const { error } = await supabase
    .from('message_reads')
    .upsert(
      messageIds.map((id) => ({ message_id: id, user_id: userId })) as never,
      { onConflict: 'message_id,user_id', ignoreDuplicates: true }
    );

  if (error) throw error;
};

export const deleteMessage = async (messageId: string, userId: string) => {
  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() } as never)
    .eq('id', messageId)
    .eq('user_id', userId);

  if (error) throw error;
};

export const updateMessage = async (messageId: string, userId: string, content: string) => {
  const { error } = await supabase
    .from('messages')
    .update({ content, updated_at: new Date().toISOString() } as never)
    .eq('id', messageId)
    .eq('user_id', userId);

  if (error) throw error;
};
