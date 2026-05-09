import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../services/supabase';
import {
  listMessages,
  sendMessage as sendMessageApi,
  toggleReaction as toggleReactionApi,
  deleteMessage,
  updateMessage,
  markMessagesAsRead
} from '../../../services/chatMessages';
import { useAuthStore } from '../../../store/authStore';
import { useToastStore } from '../../../store/toastStore';
import {
  readOfflineCache,
  writeOfflineCache
} from '../../../services/offlineCache';
import {
  enqueueOfflineAction,
  getQueuedOfflineActions,
  shouldQueueOfflineAction,
  type SendMessageOfflineAction
} from '../../../services/offlineActionQueue';
import {
  parseChatMessageContent,
  serializeChatImageMessage,
  uploadChatImage
} from '../../../services/chatMedia';
import { type ChatMessage as Message } from '../components/MessageBubble';
import type { Database, Profile, ProfileRole } from '../../../types/database';
import { isSameDay } from 'date-fns';

// Helper functions moved from GroupChatScreen
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

const mapMessageReactions = (
  reactions: { user_id: string; reaction: string }[] | undefined,
  userId?: string,
) => {
  const grouped = new Map<string, { emoji: string; count: number; reactedByMe: boolean }>();
  (reactions ?? []).forEach((reaction) => {
    const existing = grouped.get(reaction.reaction);
    if (existing) {
      existing.count += 1;
      existing.reactedByMe = existing.reactedByMe || reaction.user_id === userId;
    } else {
      grouped.set(reaction.reaction, {
        emoji: reaction.reaction,
        count: 1,
        reactedByMe: reaction.user_id === userId,
      });
    }
  });
  return Array.from(grouped.values()).sort((left, right) => right.count - left.count);
};

const mapMessageRecord = (
  message: Database['public']['Tables']['messages']['Row'] & {
    profiles: Pick<Profile, 'full_name' | 'is_verified' | 'role'> | null;
    message_reactions?: { user_id: string; reaction: string }[];
    message_reads?: { user_id: string }[];
  },
  userId?: string,
  accentColor?: string
): Message => {
  const parsedContent = parseChatMessageContent(message.content);
  const senderName = message.profiles?.full_name?.trim() || 'Unknown';
  return {
    id: message.id,
    user_id: message.user_id,
    group_id: message.group_id,
    reply_to_message_id: message.reply_to_message_id ?? null,
    content: parsedContent.type === 'image' ? (parsedContent.caption ?? '') : parsedContent.text,
    messageType: parsedContent.type,
    imageUrl: parsedContent.type === 'image' ? parsedContent.imageUrl : undefined,
    imageCaption: parsedContent.type === 'image' ? parsedContent.caption : undefined,
    imageFileName: parsedContent.type === 'image' ? parsedContent.fileName : undefined,
    created_at: message.created_at,
    updated_at: message.updated_at,
    deleted_at: message.deleted_at ?? null,
    senderName,
    senderInitials: getDisplayInitials(senderName),
    senderColor: getDisplayColor(senderName, accentColor ?? '#dcf8c6', message.user_id === userId),
    isMine: message.user_id === userId,
    verificationLevel: getVerificationLevel(message.profiles?.role, message.profiles?.is_verified),
    reactions: mapMessageReactions(message.message_reactions, userId),
    readBy: (message.message_reads ?? []).map((r) => r.user_id),
  };
};

const mergeMessages = (items: Message[]) => {
  const seen = new Set<string>();
  return items
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((left, right) => left.created_at.localeCompare(right.created_at));
};

const attachReplyMetadata = (items: Message[]) => {
  const byId = new Map(items.map((item) => [item.id, item]));
  return items.map((item) => {
    if (!item.reply_to_message_id) return item;
    const replyTarget = byId.get(item.reply_to_message_id);
    if (!replyTarget) return item;
    const preview = replyTarget.messageType === 'image' ? (replyTarget.imageCaption || 'Photo') : replyTarget.content;
    return {
      ...item,
      replySenderName: replyTarget.senderName,
      replyPreview: preview.slice(0, 100),
    };
  });
};

export function useGroupChat(groupId: string, accentColor: string) {
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();
  const [typingPeople, setTypingPeople] = useState<string[]>([]);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const messagesQueryKey = ['messages', groupId, user?.id] as const;
  const messagesCacheKey = `group-messages:${groupId}:${user?.id ?? 'guest'}`;

  const getQueuedMessages = useCallback(async (): Promise<Message[]> => {
    if (!user?.id) return [];
    const actions = await getQueuedOfflineActions();
    return actions
      .filter((a): a is SendMessageOfflineAction & { type: 'send_message' } =>
        a.type === 'send_message' && a.payload.groupId === groupId && a.payload.userId === user.id
      )
      .map((action) => {
        const payload = action.payload;
        let content = payload.content;
        let messageType: 'text' | 'image' = 'text';
        let imageUrl: string | undefined;

        if (payload.pendingImage) {
          messageType = 'image';
          imageUrl = payload.pendingImage.previewUri;
          content = serializeChatImageMessage({
            imageUrl: payload.pendingImage.previewUri,
            caption: payload.content,
            fileName: payload.pendingImage.fileName ?? undefined,
            mimeType: payload.pendingImage.mimeType ?? undefined,
          });
        }

        const senderName = payload.senderName || user.full_name || 'You';
        return {
          id: action.id,
          user_id: user.id,
          group_id: groupId,
          content,
          messageType,
          imageUrl,
          imageCaption: messageType === 'image' ? content : undefined,
          reply_to_message_id: payload.replyToMessageId ?? null,
          replySenderName: payload.replySenderName,
          replyPreview: payload.replyPreview,
          created_at: action.createdAt,
          updated_at: action.createdAt,
          senderName,
          senderInitials: getDisplayInitials(senderName),
          senderColor: getDisplayColor(senderName, accentColor, true),
          isMine: true,
          verificationLevel: getVerificationLevel(user.role, user.is_verified),
          reactions: [],
          readBy: [],
          syncStatus: 'pending',
        } as Message;
      });
  }, [groupId, accentColor, user]);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: messagesQueryKey,
    queryFn: async () => {
      try {
        const data = await listMessages(groupId);
        const mapped = (data ?? []).map((m) => mapMessageRecord(m as any, user?.id, accentColor));
        const queued = await getQueuedMessages();
        const merged = attachReplyMetadata(mergeMessages([...mapped, ...queued]));
        await writeOfflineCache(messagesCacheKey, merged);
        return merged;
      } catch (error) {
        const cached = await readOfflineCache<Message[]>(messagesCacheKey);
        const queued = await getQueuedMessages();
        if (cached) return attachReplyMetadata(mergeMessages([...cached.data, ...queued]));
        return queued;
      }
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, replyToMessageId, replyMetadata }: {
      content: string;
      replyToMessageId?: string | null;
      replyMetadata?: { senderName: string; preview: string };
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      await sendMessageApi(groupId, user.id, content, replyToMessageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagesQueryKey });
    },
    onError: async (error, variables) => {
      if (!user?.id) return;
      if (await shouldQueueOfflineAction(error)) {
        await enqueueOfflineAction({
          type: 'send_message',
          payload: {
            userId: user.id,
            groupId,
            content: variables.content,
            senderName: user.full_name || 'You',
            replyToMessageId: variables.replyToMessageId,
            replySenderName: variables.replyMetadata?.senderName,
            replyPreview: variables.replyMetadata?.preview,
          },
        });
        queryClient.invalidateQueries({ queryKey: messagesQueryKey });
        showToast({ title: 'Offline', message: 'Message queued.', variant: 'warning' });
      }
    }
  });

  const toggleReactionMutation = useMutation({
    mutationFn: async ({ messageId, reaction }: { messageId: string; reaction: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      await toggleReactionApi(messageId, user.id, reaction);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: messagesQueryKey }),
  });

  // Typing presence
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel(`typing:${groupId}`, { config: { presence: { key: user.id } } });
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ typing?: boolean; name?: string }>();
      const typers = Object.entries(state)
        .filter(([key, payloads]) => key !== user.id && payloads.some((p) => p.typing))
        .map(([, payloads]) => payloads.find((p) => p.typing)?.name ?? 'Someone');
      setTypingPeople(typers);
    }).subscribe();
    presenceChannelRef.current = channel;
    return () => { void supabase.removeChannel(channel); };
  }, [groupId, user?.id]);

  const setTyping = (isTyping: boolean) => {
    void presenceChannelRef.current?.track({ typing: isTyping, name: user?.full_name || 'Someone' });
  };

  const toggleReaction = useCallback((messageId: string, reaction: string) => {
    toggleReactionMutation.mutate({ messageId, reaction });
  }, [toggleReactionMutation]);

  return {
    messages,
    isLoading,
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending,
    toggleReaction,
    typingPeople,
    setTyping,
    markAsRead: (ids: string[]) => user?.id && markMessagesAsRead(ids, user.id),
    deleteMsg: (id: string) => user?.id && deleteMessage(id, user.id),
    updateMsg: (id: string, content: string) => user?.id && updateMessage(id, user.id, content),
  };
}
