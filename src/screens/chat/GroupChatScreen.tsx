// src/screens/chat/GroupChatScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { HeaderBar } from '../../components/common';
import { BaseColors, Typography } from '../../constants/theme';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  readOfflineCache,
  writeOfflineCache,
} from '../../services/offlineCache';
import {
  enqueueOfflineAction,
  getQueuedOfflineActions,
  shouldQueueOfflineAction,
  type SendMessageOfflineAction,
} from '../../services/offlineActionQueue';
import {
  getChatImageUploadErrorMessage,
  parseChatMessageContent,
  serializeChatImageMessage,
  uploadChatImage,
} from '../../services/chatMedia';
import {
  addGroupAdmin,
  addGroupMember,
  getGroupAdminIds,
  getPendingJoinRequests,
  logGroupAdminAction,
  removeGroupAdmin,
  searchProfilesForGroupInvite,
  type GroupAdminAuditAction,
  type GroupMemberProfile,
} from '../../services/chatGroups';
import { supabase } from '../../services/supabase';
import { format, isSameDay } from 'date-fns';
import type { Database, Profile, ProfileRole } from '../../types/database';
import type { HomeStackNavigationProp, GroupChatRouteProp } from '../../types/navigation';

interface Message {
  id: string;
  user_id: string;
  group_id: string;
  content: string;
  reply_to_message_id?: string | null;
  replySenderName?: string;
  replyPreview?: string;
  messageType: 'text' | 'image';
  imageUrl?: string;
  imageCaption?: string;
  imageFileName?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  senderName: string;
  senderInitials: string;
  senderColor: string;
  isMine: boolean;
  verificationLevel: 'none' | 'gold' | 'black';
  reactions: {
    emoji: string;
    count: number;
    reactedByMe: boolean;
  }[];
  readBy: string[];  // user_ids who have read this message
  syncStatus?: 'pending';
}

interface GroupMember {
  id: string;
  name: string;
  initials: string;
  color: string;
  verificationLevel: 'none' | 'gold' | 'black';
  isYou?: boolean;
  isAdmin?: boolean;
}

interface GroupDetails {
  id: string;
  name: string;
  emoji: string | null;
  description: string | null;
  display_picture_url: string | null;
  is_private: boolean;
  created_by: string | null;
}

interface PendingChatImage {
  uri: string;
  base64: string;
  mimeType?: string | null;
  fileName?: string | null;
  sourceLabel: string;
}

interface SelectedImageViewer {
  uri: string;
  caption?: string;
}

interface MessageActionTarget {
  id: string;
  senderName: string;
  preview: string;
  copyValue: string;
  currentReaction?: string | null;
}

const GROUP_META: Record<string, { emoji: string; membersLabel: string }> = {
  'young-adults': { emoji: '👨‍👩', membersLabel: '14 members' },
  'mens-bible-study': { emoji: '📖', membersLabel: '9 members' },
};

const EMOJI_OPTIONS = ['🙏', '🔥', '🙌', '❤️', '😊', '👏', '🎉', '📖', '⛪', '🤍'];
const QUICK_REACTION_OPTIONS = ['❤️', '🙏', '🔥', '👏', '😊'];

const getVerificationLevel = (
  role?: ProfileRole | string | null,
  isVerified?: boolean | null,
): 'none' | 'gold' | 'black' => {
  if (role === 'pastor' || role === 'admin') {
    return 'black';
  }

  if (isVerified) {
    return 'gold';
  }

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
  if (isCurrentUser) {
    return accentColor;
  }

  const colorPalette = ['#075E54', '#128C7E', '#25D366', '#34B7F1', '#E50914', '#F4B400', '#DB4437'];
  const nameHash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colorPalette[nameHash % colorPalette.length];
};

const getSupabaseErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message.toLowerCase();
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message.toLowerCase();
    }
  }

  return String(error).toLowerCase();
};

const isMissingChatGroupMembersTable = (error: unknown) => {
  const message = getSupabaseErrorMessage(error);

  return (
    message.includes('chat_group_members')
    && (
      message.includes('does not exist')
      || message.includes('could not find the table')
      || message.includes('relation')
      || message.includes('schema cache')
    )
  );
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
      return;
    }

    grouped.set(reaction.reaction, {
      emoji: reaction.reaction,
      count: 1,
      reactedByMe: reaction.user_id === userId,
    });
  });

  return Array.from(grouped.values()).sort((left, right) => right.count - left.count);
};

const applyOptimisticReactionUpdate = (
  items: Message[],
  messageId: string,
  reaction: string,
) => {
  return items.map((item) => {
    if (item.id !== messageId) {
      return item;
    }

    const existingReaction = (item.reactions ?? []).find((entry) => entry.reactedByMe)?.emoji ?? null;
    let nextReactions = (item.reactions ?? []).map((entry) => ({ ...entry }));

    if (existingReaction) {
      nextReactions = nextReactions
        .map((entry) => {
          if (entry.emoji !== existingReaction) {
            return entry;
          }

          return {
            ...entry,
            count: entry.count - 1,
            reactedByMe: false,
          };
        })
        .filter((entry) => entry.count > 0);
    }

    if (existingReaction !== reaction) {
      const matchIndex = nextReactions.findIndex((entry) => entry.emoji === reaction);

      if (matchIndex >= 0) {
        nextReactions[matchIndex] = {
          ...nextReactions[matchIndex],
          count: nextReactions[matchIndex].count + 1,
          reactedByMe: true,
        };
      } else {
        nextReactions.push({
          emoji: reaction,
          count: 1,
          reactedByMe: true,
        });
      }
    }

    return {
      ...item,
      reactions: nextReactions.sort((left, right) => right.count - left.count),
    };
  });
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
  const senderInitials = getDisplayInitials(senderName);

  // Logic for verification level
  const verificationLevel = getVerificationLevel(message.profiles?.role, message.profiles?.is_verified);

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
    senderInitials,
    senderColor: getDisplayColor(senderName, accentColor ?? '#dcf8c6', message.user_id === userId),
    isMine: message.user_id === userId,
    verificationLevel,
    reactions: mapMessageReactions(message.message_reactions, userId),
    readBy: (message.message_reads ?? []).map((r) => r.user_id),
  };
};

const getMessagePreview = (message: Pick<Message, 'messageType' | 'content' | 'imageCaption'>) => {
  if (message.messageType === 'image') {
    return message.imageCaption?.trim() || 'Photo';
  }

  return message.content.trim();
};

const attachReplyMetadata = (items: Message[]) => {
  const byId = new Map(items.map((item) => [item.id, item]));

  return items.map((item) => {
    if (!item.reply_to_message_id) {
      return item;
    }

    const replyTarget = byId.get(item.reply_to_message_id);

    if (!replyTarget) {
      return item;
    }

    return {
      ...item,
      replySenderName: replyTarget.senderName,
      replyPreview: getMessagePreview(replyTarget).slice(0, 100),
    };
  });
};

const mergeMessages = (items: Message[]) => {
  const seen = new Set<string>();

  return items
    .filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }

      seen.add(item.id);
      return true;
    })
    .sort((left, right) => left.created_at.localeCompare(right.created_at));
};

interface SwipeableMessageProps {
  children: React.ReactNode;
  onReply: () => void;
}

const SWIPE_THRESHOLD = 60;

const SwipeableMessage = ({ children, onReply }: SwipeableMessageProps) => {
  const translateX = useSharedValue(0);
  const hasTriggered = useSharedValue(false);

  const gesture = Gesture.Pan()
    .activeOffsetX([0, 10])
    .failOffsetY([-5, 5])
    .onUpdate((event) => {
      // Only swipe to the right
      if (event.translationX > 0) {
        translateX.value = event.translationX;

        if (event.translationX > SWIPE_THRESHOLD && !hasTriggered.value) {
          hasTriggered.value = true;
          runOnJS(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          })();
        } else if (event.translationX < SWIPE_THRESHOLD && hasTriggered.value) {
          hasTriggered.value = false;
        }
      }
    })
    .onEnd(() => {
      if (translateX.value > SWIPE_THRESHOLD) {
        runOnJS(onReply)();
      }
      translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
      hasTriggered.value = false;
    });

  const rStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const iconStyle = useAnimatedStyle(() => {
    const opacity = translateX.value / SWIPE_THRESHOLD;
    const scale = Math.min(translateX.value / SWIPE_THRESHOLD, 1.2);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <View style={styles.swipeableContainer}>
      <Reanimated.View style={[styles.replyIconContainer, iconStyle]}>
        <Ionicons name="return-up-back" size={20} color="#667781" />
      </Reanimated.View>
      <GestureDetector gesture={gesture}>
        <Reanimated.View style={rStyle}>
          {children}
        </Reanimated.View>
      </GestureDetector>
    </View>
  );
};

export default function GroupChatScreen() {
  const navigation = useNavigation<HomeStackNavigationProp>();
  const route = useRoute<GroupChatRouteProp>();
  const { theme, colors } = useThemeStore();
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();

  const groupId = route.params?.groupId ?? 'young-adults';
  const defaultGroupName = route.params?.groupName ?? 'Young Adults Fellowship';
  const groupMeta = GROUP_META[groupId] ?? { emoji: '👥', membersLabel: 'Members' };

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingChatImage | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false);
  const [selectedImageViewer, setSelectedImageViewer] = useState<SelectedImageViewer | null>(null);
  const [replyTarget, setReplyTarget] = useState<MessageActionTarget | null>(null);
  const [selectedMessageAction, setSelectedMessageAction] = useState<MessageActionTarget | null>(null);
  const [groupAboutDraft, setGroupAboutDraft] = useState('');
  const [groupPictureDraft, setGroupPictureDraft] = useState<string | null>(null);
  const [isSavingGroupSettings, setIsSavingGroupSettings] = useState(false);
  const [isUploadingGroupPicture, setIsUploadingGroupPicture] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [, setShowingCachedData] = useState(false);
  const [, setOfflineTimestamp] = useState<string | null>(null);
  const [typingPeople, setTypingPeople] = useState<string[]>([]);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingAnim = useRef(new Animated.Value(0)).current;
  const messagesQueryKey = ['messages', groupId, user?.id] as const;
  const messagesCacheKey = `group-messages:${groupId}:${user?.id ?? 'guest'}`;

  const insets = useSafeAreaInsets();
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);

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
          senderColor: getDisplayColor(senderName, theme.accent, true),
          isMine: true,
          verificationLevel: getVerificationLevel(user.role, user.is_verified),
          reactions: [],
          readBy: [],
          syncStatus: 'pending',
        } as Message;
      });
  }, [groupId, theme.accent, user]);

  const { data: groupDetails } = useQuery<GroupDetails | null>({
    queryKey: ['chat-group-details', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_groups')
        .select('*')
        .eq('id', groupId)
        .returns<GroupDetails>()
        .maybeSingle();

      if (error) {
        console.error('loadGroupDetails error', error);
        return null;
      }

      return data;
    },
  });

  const { data: groupAdminIds = [] } = useQuery({
    queryKey: ['chat-group-admins', groupId],
    queryFn: () => getGroupAdminIds(groupId),
  });

  const groupAdminSet = useMemo(() => new Set(groupAdminIds), [groupAdminIds]);
  const isGroupAdmin = user?.id ? groupAdminSet.has(user.id) : false;
  const groupAdminCount = groupAdminSet.size;

  const { data: pendingJoinRequests = [] } = useQuery({
    queryKey: ['chat-group-pending-requests', groupId],
    queryFn: () => getPendingJoinRequests(groupId),
    enabled: isGroupAdmin,
  });

  const logAdminAction = useCallback(async (
    action: GroupAdminAuditAction,
    params: { targetUserId?: string | null; metadata?: Record<string, unknown> } = {}
  ) => {
    if (!user?.id) return;
    try {
      await logGroupAdminAction({
        groupId,
        actorUserId: user.id,
        action,
        targetUserId: params.targetUserId,
        metadata: params.metadata,
      });
    } catch (error) {
      console.error('Failed to log admin action:', error);
    }
  }, [groupId, user?.id]);

  const groupName = groupDetails?.name ?? defaultGroupName;
  const groupEmoji = groupDetails?.emoji ?? groupMeta.emoji;
  const groupAbout = groupDetails?.description ?? 'Welcome to our fellowship group chat! Connect, share, and grow together.';
  const isPrivateGroup = groupDetails?.is_private ?? false;

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: messagesQueryKey,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            id,
            user_id,
            group_id,
            reply_to_message_id,
            content,
            created_at,
            updated_at,
            deleted_at,
            profiles:user_id (full_name, is_verified, role),
            message_reactions(user_id, reaction),
            message_reads(user_id)
          `)
          .eq('group_id', groupId)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .returns<(Database['public']['Tables']['messages']['Row'] & {
            profiles: Pick<Profile, 'full_name' | 'is_verified' | 'role'> | null;
            message_reactions: { user_id: string; reaction: string }[];
            message_reads: { user_id: string }[];
          })[]>();

        if (error) throw error;

        const mapped = (data ?? []).map((message) => (
          mapMessageRecord(message, user?.id, theme.accent)
        ));
        const queuedMessages = await getQueuedMessages();
        const merged = attachReplyMetadata(mergeMessages([...mapped, ...queuedMessages]));
        await writeOfflineCache(messagesCacheKey, merged);
        setShowingCachedData(false);
        setOfflineTimestamp(null);
        return merged;
      } catch (error) {
        const cached = await readOfflineCache<Message[]>(messagesCacheKey);
        const queuedMessages = await getQueuedMessages();

        if (cached) {
          setShowingCachedData(true);
          setOfflineTimestamp(cached.updatedAt);
          return attachReplyMetadata(mergeMessages([...cached.data, ...queuedMessages]));
        }

        if (queuedMessages.length > 0) {
          setShowingCachedData(true);
          setOfflineTimestamp(new Date().toISOString());
          return attachReplyMetadata(queuedMessages);
        }

        throw error;
      }
    },
  });

  useEffect(() => {
    const latest = messages[messages.length - 1]?.id;
    if (latest && latest !== lastMessageId) {
      if (showScrollToBottom) {
        setHasNewMessages(true);
      }
      setLastMessageId(latest);
    }
  }, [messages, showScrollToBottom, lastMessageId]);

  const { data: explicitGroupMembers } = useQuery<GroupMember[] | null>({
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

      if (error) {
        if (isMissingChatGroupMembersTable(error)) {
          return null;
        }

        console.error('loadGroupMembers error', error);
        return null;
      }

      return (data ?? []).map((member) => {
        const memberName = member.profiles?.full_name?.trim() || 'Unknown';
        const isCurrentUser = member.user_id === user?.id;

        return {
          id: member.user_id,
          name: memberName,
          initials: getDisplayInitials(memberName),
          color: getDisplayColor(memberName, theme.accent, isCurrentUser),
          verificationLevel: getVerificationLevel(member.profiles?.role, member.profiles?.is_verified),
          isYou: isCurrentUser,
          isAdmin: groupAdminSet.has(member.user_id),
        };
      });
    },
  });

  const fallbackGroupMembers = useMemo<GroupMember[]>(() => {
    const membersMap = new Map<string, GroupMember>();

    messages.forEach((message) => {
      if (!membersMap.has(message.user_id)) {
        membersMap.set(message.user_id, {
          id: message.user_id,
          name: message.senderName,
          initials: message.senderInitials,
          color: message.senderColor,
          verificationLevel: message.verificationLevel,
          isYou: message.user_id === user?.id,
          isAdmin: groupAdminSet.has(message.user_id),
        });
      }
    });

    if (user?.id && !membersMap.has(user.id)) {
      const ownName = user.full_name?.trim() || 'You';
      membersMap.set(user.id, {
        id: user.id,
        name: ownName,
        initials: getDisplayInitials(ownName),
        color: theme.accent,
        verificationLevel: getVerificationLevel(user.role, user.is_verified),
        isYou: true,
        isAdmin: groupAdminSet.has(user.id),
      });
    }

    return Array.from(membersMap.values()).sort((left, right) => {
      if (left.isYou && !right.isYou) return -1;
      if (!left.isYou && right.isYou) return 1;
      return left.name.localeCompare(right.name);
    });
  }, [groupAdminSet, messages, theme.accent, user?.full_name, user?.id, user?.is_verified, user?.role]);

  const groupMembers = useMemo<GroupMember[]>(() => {
    if (explicitGroupMembers && explicitGroupMembers.length > 0) {
      return [...explicitGroupMembers]
        .map((member) => ({ ...member, isAdmin: groupAdminSet.has(member.id) }))
        .sort((left, right) => {
        if (left.isYou && !right.isYou) return -1;
        if (!left.isYou && right.isYou) return 1;
        return left.name.localeCompare(right.name);
      });
    }

    return fallbackGroupMembers.map((member) => ({ ...member, isAdmin: groupAdminSet.has(member.id) }));
  }, [explicitGroupMembers, fallbackGroupMembers, groupAdminSet]);

  const groupMembersLabel = groupMembers.length > 0
    ? `${groupMembers.length} member${groupMembers.length === 1 ? '' : 's'}`
    : groupMeta.membersLabel;

  const existingMemberIds = useMemo(() => groupMembers.map((member) => member.id), [groupMembers]);

  const { data: inviteCandidates = [] } = useQuery<GroupMemberProfile[]>({
    queryKey: ['chat-group-member-search', groupId, memberSearchQuery, existingMemberIds.join('|')],
    queryFn: () => searchProfilesForGroupInvite(memberSearchQuery, existingMemberIds),
    enabled: isGroupAdmin && showMembersModal && memberSearchQuery.trim().length >= 2,
  });

  const hasComposerContent = Boolean(inputText.trim() || pendingAttachment);

  const addMemberMutation = useMutation({
    mutationFn: (memberUserId: string) => addGroupMember(groupId, memberUserId),
    onSuccess: async (_data, memberUserId) => {
      await queryClient.invalidateQueries({ queryKey: ['chat-group-members', groupId, user?.id] });
      await logAdminAction('member_added', { targetUserId: memberUserId });
      setMemberSearchQuery('');
      showToast({
        title: 'Member added',
        message: 'The user is now part of this group.',
        variant: 'success',
      });
    },
    onError: (error) => {
      showToast({
        title: 'Add member failed',
        message: error instanceof Error ? error.message : String(error),
        variant: 'error',
      });
    },
  });

  const makeAdminMutation = useMutation({
    mutationFn: (memberUserId: string) => addGroupAdmin(groupId, memberUserId),
    onSuccess: async (_data, memberUserId) => {
      await queryClient.invalidateQueries({ queryKey: ['chat-group-admins', groupId] });
      await logAdminAction('admin_granted', { targetUserId: memberUserId });
      showToast({
        title: 'Admin granted',
        message: 'This member can now manage group settings and requests.',
        variant: 'success',
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const normalized = errorMessage.toLowerCase();

      showToast({
        title: 'Could not grant admin',
        message: normalized.includes('duplicate') || normalized.includes('unique')
          ? 'This member is already an admin.'
          : errorMessage,
        variant: 'error',
      });
    },
  });

  const removeAdminMutation = useMutation({
    mutationFn: (memberUserId: string) => removeGroupAdmin(groupId, memberUserId),
    onSuccess: async (_data, memberUserId) => {
      await queryClient.invalidateQueries({ queryKey: ['chat-group-admins', groupId] });
      await logAdminAction('admin_removed', { targetUserId: memberUserId });
      showToast({
        title: 'Admin removed',
        message: 'The member no longer has group admin privileges.',
        variant: 'success',
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const normalized = errorMessage.toLowerCase();
      showToast({
        title: 'Could not remove admin',
        message: normalized.includes('last admin')
          ? 'At least one admin must remain in this group.'
          : errorMessage,
        variant: 'error',
      });
    },
  });

  const toggleReactionMutation = useMutation({
    mutationFn: async ({ messageId, reaction }: { messageId: string; reaction: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data: existingReaction, error: loadError } = await supabase
        .from('message_reactions')
        .select('id, reaction')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .returns<{ id: string; reaction: string }>()
        .maybeSingle();

      if (loadError) throw loadError;

      if (existingReaction && (existingReaction as any).reaction === reaction) {
        const { error: deleteError } = await supabase
          .from('message_reactions')
          .delete()
          .eq('id', (existingReaction as any).id);

        if (deleteError) throw deleteError;
        return;
      }

      if (existingReaction && (existingReaction as any).id) {
        const { error: updateError } = await supabase
          .from('message_reactions')
          .update({ reaction } as never)
          .eq('id', (existingReaction as any).id);

        if (updateError) throw updateError;
        return;
      }

      const { error: insertError } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          reaction,
        } as never);

      if (insertError) throw insertError;
    },
    onMutate: async ({ messageId, reaction }) => {
      await queryClient.cancelQueries({ queryKey: messagesQueryKey });
      const previousMessages = queryClient.getQueryData<Message[]>(messagesQueryKey) ?? [];
      const nextMessages = applyOptimisticReactionUpdate(previousMessages, messageId, reaction);
      queryClient.setQueryData(messagesQueryKey, nextMessages);
      void writeOfflineCache(messagesCacheKey, nextMessages);
      return { previousMessages };
    },
    onError: (error, _variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(messagesQueryKey, context.previousMessages);
        void writeOfflineCache(messagesCacheKey, context.previousMessages);
      }

      showToast({
        title: 'Reaction failed',
        message: error.message,
        variant: 'error',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', groupId, user?.id] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, replyToMessageId }: { content: string; replyToMessageId?: string | null }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('messages')
        .insert({
          user_id: user.id,
          group_id: groupId,
          content,
          reply_to_message_id: replyToMessageId ?? null,
        } as never);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', groupId, user?.id] });
      setInputText('');
      setPendingAttachment(null);
      setReplyTarget(null);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    },
    onError: async (error, variables) => {
      if (!user?.id) {
        showToast({
          title: 'Message failed',
          message: error.message,
          variant: 'error',
        });
        return;
      }

      if (await shouldQueueOfflineAction(error)) {
        const queuedAction = await enqueueOfflineAction({
          type: 'send_message',
          payload: {
            userId: user.id,
            groupId,
            content: variables.content,
            senderName: user.full_name?.trim() || 'You',
            replyToMessageId: variables.replyToMessageId ?? null,
            replySenderName: replyTarget?.senderName,
            replyPreview: replyTarget?.preview,
          },
        });

        const queuedMessage: Message = {
          ...mapMessageRecord({
            id: queuedAction.id,
            user_id: user.id,
            group_id: groupId,
            reply_to_message_id: variables.replyToMessageId ?? null,
            content: variables.content,
            created_at: queuedAction.createdAt,
            updated_at: queuedAction.createdAt,
            deleted_at: null,
            profiles: {
              full_name: user.full_name?.trim() || 'You',
              is_verified: user.is_verified,
              role: user.role,
            },
          }, user.id, theme.accent),
          replySenderName: replyTarget?.senderName,
          replyPreview: replyTarget?.preview,
          syncStatus: 'pending',
        };

        const currentMessages = queryClient.getQueryData<Message[]>(messagesQueryKey) ?? [];
        const updatedMessages = attachReplyMetadata(mergeMessages([...currentMessages, queuedMessage]));
        queryClient.setQueryData(messagesQueryKey, updatedMessages);
        void writeOfflineCache(messagesCacheKey, updatedMessages);
        setInputText('');
        setPendingAttachment(null);
        setReplyTarget(null);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        showToast({
          title: 'Saved offline',
          message: 'Your message will send automatically when you are back online.',
          variant: 'warning',
        });
        return;
      }

      showToast({
        title: 'Message failed',
        message: error.message,
        variant: 'error',
      });
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', groupId, user?.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', groupId, user?.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reads',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', groupId, user?.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient, user?.id]);

  // Auto-mark incoming messages as read
  useEffect(() => {
    if (!user?.id || messages.length === 0) return;

    const unread = messages.filter(
      (msg) => !msg.isMine && !(msg.readBy ?? []).includes(user.id),
    );

    if (unread.length === 0) return;

    void supabase
      .from('message_reads')
      .upsert(
        unread.map((msg) => ({ message_id: msg.id, user_id: user.id! })) as never,
        { onConflict: 'message_id,user_id', ignoreDuplicates: true },
      );
  }, [messages, user?.id]);

  // Typing presence channel
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(`typing:${groupId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState<{ typing?: boolean; name?: string }>();
        const typers = Object.entries(presenceState)
          .filter(([key, payloads]) => key !== user.id && payloads.some((p) => p.typing))
          .map(([, payloads]) => {
            const payload = payloads.find((p) => p.typing);
            return payload?.name ?? 'Someone';
          });
        setTypingPeople(typers);
      })
      .subscribe();

    presenceChannelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      presenceChannelRef.current = null;
    };
  }, [groupId, user?.id]);

  useEffect(() => {
    if (isTyping) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(typingAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      );

      loop.start();

      return () => {
        loop.stop();
        typingAnim.setValue(0);
      };
    }

    typingAnim.setValue(0);
  }, [isTyping, typingAnim]);

  const handleSelectEmoji = useCallback((emoji: string) => {
    setInputText((prev) => {
      const nextValue = prev.trim().length > 0 ? `${prev} ${emoji}` : emoji;
      setIsTyping(nextValue.trim().length > 0);
      return nextValue;
    });
    setShowEmojiPicker(false);
  }, []);

  const handlePickAttachment = useCallback(async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      showToast({
        title: 'Library access needed',
        message: 'Allow photo library access to attach an image.',
        variant: 'warning',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset?.base64) {
      showToast({
        title: 'Attachment unavailable',
        message: 'We could not read that image. Please try another one.',
        variant: 'error',
      });
      return;
    }

    setPendingAttachment({
      uri: asset.uri,
      base64: asset.base64,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
      sourceLabel: asset.fileName ?? 'Image from gallery',
    });
    showToast({
      title: 'Attachment added',
      message: 'Your image is ready to send.',
      variant: 'success',
    });
  }, [showToast]);

  const handleCameraCapture = useCallback(async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      showToast({
        title: 'Camera access needed',
        message: 'Allow camera access to take a photo.',
        variant: 'warning',
      });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset?.base64) {
      showToast({
        title: 'Photo unavailable',
        message: 'We could not read that photo. Please try again.',
        variant: 'error',
      });
      return;
    }

    setPendingAttachment({
      uri: asset.uri,
      base64: asset.base64,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
      sourceLabel: asset.fileName ?? 'Photo from camera',
    });
    showToast({
      title: 'Photo added',
      message: 'Your photo is ready to send.',
      variant: 'success',
    });
  }, [showToast]);

  const sendMessage = async () => {
    const trimmedText = inputText.trim();

    if (sendMessageMutation.isPending || isUploadingAttachment) return;

    if (pendingAttachment) {
      if (!user?.id) {
        showToast({
          title: 'Message failed',
          message: 'Please sign in to send an image.',
          variant: 'error',
        });
        return;
      }

      try {
        setIsUploadingAttachment(true);
        const imageUrl = await uploadChatImage({
          userId: user.id,
          groupId,
          base64: pendingAttachment.base64,
          contentType: pendingAttachment.mimeType,
          fileName: pendingAttachment.fileName,
        });

        const imageMessageContent = serializeChatImageMessage({
          imageUrl,
          caption: trimmedText,
          fileName: pendingAttachment.fileName ?? pendingAttachment.sourceLabel,
          mimeType: pendingAttachment.mimeType ?? undefined,
        });

        setIsTyping(false);
        sendMessageMutation.mutate({
          content: imageMessageContent,
          replyToMessageId: replyTarget?.id ?? null,
        });
        return;
      } catch (error) {
        if (await shouldQueueOfflineAction(error)) {
          const queuedAction = await enqueueOfflineAction({
            type: 'send_message',
            payload: {
              userId: user.id,
              groupId,
              content: trimmedText,
              senderName: user.full_name?.trim() || 'You',
              replyToMessageId: replyTarget?.id ?? null,
              replySenderName: replyTarget?.senderName,
              replyPreview: replyTarget?.preview,
              pendingImage: {
                base64: pendingAttachment.base64,
                mimeType: pendingAttachment.mimeType,
                fileName: pendingAttachment.fileName,
                previewUri: pendingAttachment.uri,
              },
            },
          });

          const queuedMessage: Message = {
            ...mapMessageRecord({
              id: queuedAction.id,
              user_id: user.id,
              group_id: groupId,
              reply_to_message_id: replyTarget?.id ?? null,
              content: serializeChatImageMessage({
                imageUrl: pendingAttachment.uri,
                caption: trimmedText,
                fileName: pendingAttachment.fileName ?? pendingAttachment.sourceLabel,
                mimeType: pendingAttachment.mimeType ?? undefined,
              }),
              created_at: queuedAction.createdAt,
              updated_at: queuedAction.createdAt,
              deleted_at: null,
              profiles: {
                full_name: user.full_name?.trim() || 'You',
                is_verified: user.is_verified,
                role: user.role,
              },
            }, user.id, theme.accent),
            replySenderName: replyTarget?.senderName,
            replyPreview: replyTarget?.preview,
            syncStatus: 'pending',
          };

          const currentMessages = queryClient.getQueryData<Message[]>(messagesQueryKey) ?? [];
          const updatedMessages = attachReplyMetadata(mergeMessages([...currentMessages, queuedMessage]));
          queryClient.setQueryData(messagesQueryKey, updatedMessages);
          void writeOfflineCache(messagesCacheKey, updatedMessages);
          setInputText('');
          setPendingAttachment(null);
          setReplyTarget(null);
          setIsTyping(false);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          showToast({
            title: 'Saved offline',
            message: 'Your image message will send automatically when you are back online.',
            variant: 'warning',
          });
          return;
        }

        showToast({
          title: 'Image send failed',
          message: getChatImageUploadErrorMessage(error instanceof Error ? error.message : String(error)),
          variant: 'error',
        });
        return;
      } finally {
        setIsUploadingAttachment(false);
      }
    }

    const messageContent = trimmedText;

    if (!messageContent) return;

    setIsTyping(false);
    void presenceChannelRef.current?.track({ typing: false, name: user?.full_name?.trim() || 'Someone' });
    sendMessageMutation.mutate({
      content: messageContent,
      replyToMessageId: replyTarget?.id ?? null,
    });
  };

  const handleMessageAction = useCallback((message: Message) => {
    const preview = message.messageType === 'image'
      ? (message.imageCaption || 'Photo')
      : message.content;
    const copyValue = message.messageType === 'image'
      ? (message.imageCaption?.trim() || message.imageUrl || 'Photo')
      : message.content;

    setSelectedMessageAction({
      id: message.id,
      senderName: message.senderName,
      preview: preview.slice(0, 100),
      copyValue,
      currentReaction: (message.reactions ?? []).find((entry) => entry.reactedByMe)?.emoji ?? null,
    });
  }, []);

  const handleToggleReaction = useCallback((messageId: string, reaction: string) => {
    toggleReactionMutation.mutate({ messageId, reaction });
  }, [toggleReactionMutation]);

  const handleCopyMessage = useCallback(async () => {
    if (!selectedMessageAction) return;

    try {
      await Clipboard.setStringAsync(selectedMessageAction.copyValue);
      showToast({
        title: 'Copied',
        message: 'Message copied to clipboard.',
        variant: 'success',
      });
    } catch {
      showToast({
        title: 'Copy failed',
        message: 'Could not copy this message. Please try again.',
        variant: 'error',
      });
    }

    setSelectedMessageAction(null);
  }, [selectedMessageAction, showToast]);


  const openGroupSettings = useCallback(() => {
    setGroupAboutDraft(groupDetails?.description ?? '');
    setGroupPictureDraft(groupDetails?.display_picture_url ?? null);
    setShowGroupSettingsModal(true);
  }, [groupDetails?.description, groupDetails?.display_picture_url]);

  const handlePickGroupDisplayPicture = useCallback(async () => {
    if (!user?.id) {
      showToast({
        title: 'Sign in required',
        message: 'Please sign in before updating the group picture.',
        variant: 'warning',
      });
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      showToast({
        title: 'Library access needed',
        message: 'Allow photo library access to select a group picture.',
        variant: 'warning',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      allowsEditing: true,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset?.base64) {
      showToast({
        title: 'Image unavailable',
        message: 'We could not read that image. Please try another one.',
        variant: 'error',
      });
      return;
    }

    try {
      setIsUploadingGroupPicture(true);

      const imageUrl = await uploadChatImage({
        userId: user.id,
        groupId,
        base64: asset.base64,
        contentType: asset.mimeType,
        fileName: asset.fileName,
        uploadKey: `group-avatar-${Date.now()}`,
      });

      setGroupPictureDraft(imageUrl);
      showToast({
        title: 'Picture uploaded',
        message: 'Save changes to apply this group picture.',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Upload failed',
        message: getChatImageUploadErrorMessage(error instanceof Error ? error.message : String(error)),
        variant: 'error',
      });
    } finally {
      setIsUploadingGroupPicture(false);
    }
  }, [groupId, showToast, user?.id]);

  const handleSaveGroupSettings = useCallback(async () => {
    if (!isGroupAdmin) {
      showToast({
        title: 'Not allowed',
        message: 'Only group admins can update this group.',
        variant: 'warning',
      });
      return;
    }

    try {
      setIsSavingGroupSettings(true);

      const { error } = await supabase
        .from('chat_groups')
        .update({
          description: groupAboutDraft.trim() || null,
          display_picture_url: groupPictureDraft?.trim() || null,
        } as never)
        .eq('id', groupId);

      if (error) {
        throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ['chat-group-details', groupId] });
      await logAdminAction('group_settings_updated', {
        metadata: {
          updatedAbout: true,
          updatedPicture: true,
        },
      });
      setShowGroupSettingsModal(false);
      showToast({
        title: 'Group updated',
        message: 'Group about and display picture were saved.',
        variant: 'success',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const lower = errorMessage.toLowerCase();
      const message = lower.includes('row-level security') || lower.includes('permission')
        ? 'You do not have permission to update this group.'
        : errorMessage;

      showToast({
        title: 'Update failed',
        message,
        variant: 'error',
      });
    } finally {
      setIsSavingGroupSettings(false);
    }
  }, [groupAboutDraft, groupId, groupPictureDraft, isGroupAdmin, logAdminAction, queryClient, showToast]);

  const headerHeight = 56 + insets.top;

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const layoutHeight = event.nativeEvent.layoutMeasurement.height;

    // Show button if we are more than 300px from the bottom
    const isCloseToBottom = contentHeight - layoutHeight - offsetY < 300;
    setShowScrollToBottom(!isCloseToBottom);
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const renderMessage = useCallback(({ item, index }: { item: Message, index: number }) => {
    const isMine = item.isMine;
    const prevMsg = messages[index - 1];
    const isSameSender = prevMsg && prevMsg.user_id === item.user_id;
    const isDifferentDay = !prevMsg || !isSameDay(new Date(prevMsg.created_at), new Date(item.created_at));
    const showSenderMeta = !isMine && !isSameSender;

    const onReply = () => {
      const preview = item.messageType === 'image'
        ? (item.imageCaption || 'Photo')
        : item.content;
      const copyValue = item.messageType === 'image'
        ? (item.imageCaption?.trim() || item.imageUrl || 'Photo')
        : item.content;

      setReplyTarget({
        id: item.id,
        senderName: item.senderName,
        preview: preview.slice(0, 100),
        copyValue,
        currentReaction: (item.reactions ?? []).find((entry) => entry.reactedByMe)?.emoji ?? null,
      });
    };

    return (
      <View>
        {isDifferentDay && (
          <View style={styles.dateHeader}>
            <View style={styles.datePill}>
              <Text style={styles.dateText}>
                {format(new Date(item.created_at), 'MMMM d, yyyy')}
              </Text>
            </View>
          </View>
        )}
        <SwipeableMessage onReply={onReply}>
          <View style={[styles.msgRow, isMine && styles.msgRowOut, isSameSender && { marginTop: 2 }]}>
            {showSenderMeta ? (
              <View style={[styles.msgAvatar, { backgroundColor: item.senderColor }]}>
                <Text style={styles.msgAvatarText}>{item.senderInitials}</Text>
              </View>
            ) : !isMine ? (
              <View style={styles.msgAvatarSpacer} />
            ) : null}
            <TouchableOpacity
              activeOpacity={0.92}
              delayLongPress={220}
              onLongPress={() => handleMessageAction(item)}
              style={styles.bubbleShell}
            >
              <View
                style={[
                  styles.bubble,
                  isMine ? styles.bubbleOut : styles.bubbleIn,
                  isSameSender && (isMine ? styles.bubbleOutTailHidden : styles.bubbleInTailHidden)
                ]}
              >
                {showSenderMeta && (
                  <View style={styles.senderHeader}>
                    <Text style={[styles.msgSenderName, { color: item.senderColor }]}>{item.senderName}</Text>
                    {item.verificationLevel === 'gold' && (
                      <Ionicons name="checkmark-circle" size={12} color="#D4AF37" style={styles.verifyBadge} />
                    )}
                    {item.verificationLevel === 'black' && (
                      <Ionicons name="checkmark-circle" size={12} color="#000000" style={styles.verifyBadge} />
                    )}
                  </View>
                )}
                <View style={styles.messageContentRow}>
                  {item.messageType === 'image' && item.imageUrl ? (
                    <View style={styles.imageMessageWrap}>
                      {item.replyPreview ? (
                        <View style={[styles.replySnippet, isMine ? styles.replySnippetOut : styles.replySnippetIn]}>
                          <Text style={[styles.replySnippetName, { color: isMine ? '#1f5f3f' : item.senderColor }]}>
                            {item.replySenderName}
                          </Text>
                          <Text style={styles.replySnippetText} numberOfLines={2}>{item.replyPreview}</Text>
                        </View>
                      ) : null}
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => setSelectedImageViewer({ uri: item.imageUrl!, caption: item.imageCaption })}
                        accessibilityRole="button"
                        accessibilityLabel="Open image in fullscreen"
                      >
                        <Image source={{ uri: item.imageUrl }} style={styles.chatImage} resizeMode="cover" />
                      </TouchableOpacity>
                      {item.imageCaption ? (
                        <Text style={[styles.bubbleText, isMine && styles.bubbleTextOut]}>
                          {item.imageCaption}
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <>
                      {item.replyPreview ? (
                        <View style={[styles.replySnippet, isMine ? styles.replySnippetOut : styles.replySnippetIn]}>
                          <Text style={[styles.replySnippetName, { color: isMine ? '#1f5f3f' : item.senderColor }]}>
                            {item.replySenderName}
                          </Text>
                          <Text style={styles.replySnippetText} numberOfLines={2}>{item.replyPreview}</Text>
                        </View>
                      ) : null}
                      <Text style={[styles.bubbleText, isMine && styles.bubbleTextOut]}>
                        {item.content}
                      </Text>
                    </>
                  )}
                  <View style={styles.messageMeta}>
                    <Text style={styles.msgTimePill}>
                      {format(new Date(item.created_at), 'h:mm a')}
                    </Text>
                    {isMine && (
                      <Ionicons
                        name={
                          item.syncStatus === 'pending'
                            ? 'time-outline'
                            : (item.readBy ?? []).some((rid) => rid !== user?.id)
                            ? 'checkmark-done'
                            : 'checkmark'
                        }
                        size={14}
                        color={
                          item.syncStatus === 'pending'
                            ? '#999'
                            : (item.readBy ?? []).some((rid) => rid !== user?.id)
                            ? '#34B7F1'
                            : '#aab7bf'
                        }
                        style={styles.statusCheck}
                      />
                    )}
                  </View>
                </View>
              </View>

              {(item.reactions ?? []).length > 0 ? (
                <View style={[styles.reactionRow, isMine && styles.reactionRowOut]}>
                  {(item.reactions ?? []).map((reactionEntry) => (
                    <TouchableOpacity
                      key={`${item.id}-${reactionEntry.emoji}`}
                      activeOpacity={0.88}
                      style={[
                        styles.reactionChip,
                        reactionEntry.reactedByMe && styles.reactionChipActive,
                      ]}
                      onPress={() => handleToggleReaction(item.id, reactionEntry.emoji)}
                    >
                      <Text style={styles.reactionEmoji}>{reactionEntry.emoji}</Text>
                      <Text style={styles.reactionCount}>{reactionEntry.count}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        </SwipeableMessage>
      </View>
    );
  }, [handleMessageAction, handleToggleReaction, messages, user?.id]);

  return (
    <View style={styles.container}>
      <HeaderBar
        title={groupName}
        subtitle={`${groupMembersLabel} · ${isPrivateGroup ? 'private group' : 'public group'}`}
        onBackPress={() => navigation.goBack()}
        enableBlur={true}
        rightAction={() => setShowMembersModal(true)}
        rightIcon="ellipsis-vertical"
      />

      <View style={[styles.chatBackground, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={headerHeight}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(message) => message.id}
                renderItem={renderMessage}
                contentContainerStyle={[styles.messagesList, { flexGrow: 1 }]}
                onContentSizeChange={() => {
                  if (!showScrollToBottom) {
                    flatListRef.current?.scrollToEnd({ animated: true });
                  }
                }}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
              />

              {showScrollToBottom && (
                <TouchableOpacity
                  style={[styles.scrollToBottomBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={scrollToBottom}
                >
                  {hasNewMessages && (
                    <View style={[styles.newMessagesBadge, { backgroundColor: theme.accent }]} />
                  )}
                  <Ionicons name="chevron-down" size={22} color={colors.text} />
                </TouchableOpacity>
              )}
            </View>
          </TouchableWithoutFeedback>

          <View style={[styles.composerArea, { backgroundColor: colors.surface }]}>
            {pendingAttachment ? (
              <View style={styles.pendingAttachmentBar}>
                <View style={[styles.pendingAttachmentChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Image source={{ uri: pendingAttachment.uri }} style={styles.pendingAttachmentPreview} />
                  <Text style={styles.pendingAttachmentText} numberOfLines={1}>{pendingAttachment.sourceLabel}</Text>
                  <TouchableOpacity onPress={() => setPendingAttachment(null)} accessibilityRole="button" accessibilityLabel="Remove pending attachment">
                    <Ionicons name="close-circle" size={18} color="#667781" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {replyTarget ? (
              <View style={[styles.replyPreviewBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.replyAccent, { backgroundColor: theme.accent }]} />
                <View style={styles.replyPreviewCopy}>
                  <Text style={[styles.replyPreviewName, { color: theme.accent }]}>{replyTarget.senderName}</Text>
                  <Text style={[styles.replyPreviewText, { color: colors.textSecondary }]} numberOfLines={1}>{replyTarget.preview}</Text>
                </View>
                <TouchableOpacity onPress={() => setReplyTarget(null)}>
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ) : null}

            {typingPeople.length > 0 ? (
              <View style={styles.typingBar}>
                <View style={styles.typingDots}>
                  <Animated.View style={[styles.typingDot, { opacity: typingAnim }]} />
                  <Animated.View style={[styles.typingDot, { opacity: typingAnim, marginLeft: 4 }]} />
                  <Animated.View style={[styles.typingDot, { opacity: typingAnim, marginLeft: 4 }]} />
                </View>
                <Text style={styles.typingText}>
                  {typingPeople.length === 1
                    ? `${typingPeople[0]} is typing…`
                    : typingPeople.length === 2
                    ? `${typingPeople[0]} and ${typingPeople[1]} are typing…`
                    : 'Several people are typing…'}
                </Text>
              </View>
            ) : null}

            <View style={[styles.bottomBar, { paddingBottom: isKeyboardVisible ? 12 : Math.max(insets.bottom, 12) }]}>
              <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.emojiBtn}
                  onPress={() => setShowEmojiPicker(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Open emoji picker"
                >
                  <Ionicons name="happy-outline" size={24} color="#85959f" />
                </TouchableOpacity>
                <TextInput
                  style={styles.textInput}
                  value={inputText}
                  onChangeText={(text) => {
                    setInputText(text);
                    setIsTyping(text.trim().length > 0);

                    const isNowTyping = text.trim().length > 0;
                    void presenceChannelRef.current?.track({
                      typing: isNowTyping,
                      name: user?.full_name?.trim() || 'Someone',
                    });

                    if (typingDebounceRef.current) {
                      clearTimeout(typingDebounceRef.current);
                    }

                    if (isNowTyping) {
                      typingDebounceRef.current = setTimeout(() => {
                        void presenceChannelRef.current?.track({ typing: false, name: user?.full_name?.trim() || 'Someone' });
                      }, 3000);
                    }
                  }}
                  placeholder="Message"
                  placeholderTextColor="#85959f"
                  multiline
                  blurOnSubmit={false}
                  selectionColor={theme.accent}
                />
                <TouchableOpacity
                  style={styles.attachBtn}
                  onPress={handlePickAttachment}
                  accessibilityRole="button"
                  accessibilityLabel="Attach image from library"
                >
                  <Ionicons name="attach" size={24} color="#85959f" style={{ transform: [{ rotate: '45deg' }] }} />
                </TouchableOpacity>
                {!hasComposerContent && (
                  <TouchableOpacity
                    style={styles.cameraBtn}
                    onPress={handleCameraCapture}
                    accessibilityRole="button"
                    accessibilityLabel="Take photo with camera"
                  >
                    <Ionicons name="camera" size={24} color="#85959f" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: theme.accent }]}
                onPress={sendMessage}
              >
                {sendMessageMutation.isPending || isUploadingAttachment ? (
                  <ActivityIndicator size="small" color={BaseColors.white} />
                ) : (
                  <Ionicons
                    name={hasComposerContent ? "send" : "mic"}
                    size={22}
                    color={BaseColors.white}
                    style={hasComposerContent && { marginLeft: 3 }}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      <Modal visible={showEmojiPicker} transparent animationType="slide" onRequestClose={() => setShowEmojiPicker(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowEmojiPicker(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Choose an emoji</Text>
            <View style={styles.emojiGrid}>
              {EMOJI_OPTIONS.map((emoji) => (
                <TouchableOpacity key={emoji} style={styles.emojiItem} onPress={() => handleSelectEmoji(emoji)}>
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showMembersModal} transparent animationType="slide" onRequestClose={() => setShowMembersModal(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowMembersModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.membersSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{groupName} members</Text>
            <Text style={styles.sheetSubtitle}>{groupMembersLabel}</Text>
            <View style={styles.groupAboutCard}>
              <Text style={styles.groupAboutLabel}>Group about</Text>
              <Text style={styles.groupAboutText}>{groupAbout}</Text>
            </View>
            {isGroupAdmin ? (
              <View style={styles.adminPanelCard}>
                <Text style={styles.adminPanelTitle}>Admin-only actions</Text>

                <TouchableOpacity style={styles.groupEditButton} onPress={openGroupSettings}>
                  <Ionicons name="create-outline" size={16} color="#111b21" />
                  <Text style={styles.groupEditButtonText}>Edit group profile & about</Text>
                </TouchableOpacity>

                {isPrivateGroup ? (
                  <View style={styles.adminSection}>
                    <TouchableOpacity
                      style={styles.manageRequestsBtn}
                      onPress={() => {
                        setShowMembersModal(false);
                        navigation.navigate('ManageRequests', { groupId, groupName });
                      }}
                    >
                      <View style={styles.manageRequestsLeft}>
                        <Ionicons name="people-circle-outline" size={20} color={theme.accent} />
                        <Text style={styles.manageRequestsText}>Manage join requests</Text>
                      </View>
                      <View style={styles.manageRequestsRight}>
                        {pendingJoinRequests.length > 0 && (
                          <View style={[styles.requestsBadge, { backgroundColor: theme.accent }]}>
                            <Text style={styles.requestsBadgeText}>{pendingJoinRequests.length}</Text>
                          </View>
                        )}
                        <Ionicons name="chevron-forward" size={16} color="#667781" />
                      </View>
                    </TouchableOpacity>
                  </View>
                ) : null}

                <View style={styles.adminSection}>
                  <Text style={styles.adminSectionTitle}>Add members</Text>
                  <TextInput
                    value={memberSearchQuery}
                    onChangeText={setMemberSearchQuery}
                    placeholder="Search by name or email"
                    placeholderTextColor="#8b97a0"
                    style={styles.adminSearchInput}
                    selectionColor={theme.accent}
                  />
                  {memberSearchQuery.trim().length < 2 ? (
                    <Text style={styles.adminEmptyText}>Type at least 2 characters to search.</Text>
                  ) : inviteCandidates.length === 0 ? (
                    <Text style={styles.adminEmptyText}>No users found.</Text>
                  ) : (
                    inviteCandidates.slice(0, 5).map((candidate) => {
                      const candidateName = candidate.full_name?.trim() || candidate.email;
                      const isAdding = addMemberMutation.isPending && addMemberMutation.variables === candidate.id;

                      return (
                        <View key={candidate.id} style={styles.adminRequestRow}>
                          <Text style={styles.adminRequestName}>{candidateName}</Text>
                          <TouchableOpacity
                            style={styles.adminApproveBtn}
                            onPress={() => addMemberMutation.mutate(candidate.id)}
                            disabled={isAdding}
                          >
                            {isAdding ? (
                              <ActivityIndicator size="small" color={BaseColors.white} />
                            ) : (
                              <Text style={styles.adminActionBtnText}>Add</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            ) : null}
            <ScrollView
              style={styles.membersList}
              contentContainerStyle={styles.membersListContent}
              keyboardDismissMode="on-drag"
            >
              {groupMembers.map((member) => (
                <View key={member.id} style={styles.memberRow}>
                  <View style={[styles.memberAvatar, { backgroundColor: member.color }]}>
                    <Text style={styles.memberAvatarText}>{member.initials}</Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      {member.isAdmin ? (
                        <View style={styles.memberAdminBadge}>
                          <Text style={styles.memberAdminBadgeText}>Admin</Text>
                        </View>
                      ) : null}
                      {member.verificationLevel === 'gold' ? (
                        <Ionicons name="checkmark-circle" size={14} color="#D4AF37" />
                      ) : member.verificationLevel === 'black' ? (
                        <Ionicons name="checkmark-circle" size={14} color="#000000" />
                      ) : null}
                    </View>
                    <Text style={styles.memberSubtext}>{member.isYou ? 'You' : (member.isAdmin ? 'Group admin' : 'Group member')}</Text>
                    {isGroupAdmin && !member.isAdmin && !member.isYou ? (
                      <TouchableOpacity
                        style={styles.makeAdminButton}
                        onPress={() => makeAdminMutation.mutate(member.id)}
                        disabled={makeAdminMutation.isPending && makeAdminMutation.variables === member.id}
                      >
                        {makeAdminMutation.isPending && makeAdminMutation.variables === member.id ? (
                          <ActivityIndicator size="small" color="#111b21" />
                        ) : (
                          <Text style={styles.makeAdminButtonText}>Make admin</Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                    {isGroupAdmin && member.isAdmin && groupAdminCount > 1 ? (
                      <TouchableOpacity
                        style={styles.removeAdminButton}
                        onPress={() => removeAdminMutation.mutate(member.id)}
                        disabled={removeAdminMutation.isPending && removeAdminMutation.variables === member.id}
                      >
                        {removeAdminMutation.isPending && removeAdminMutation.variables === member.id ? (
                          <ActivityIndicator size="small" color="#111b21" />
                        ) : (
                          <Text style={styles.removeAdminButtonText}>Remove admin</Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                    {isGroupAdmin && member.isAdmin && groupAdminCount <= 1 ? (
                      <Text style={styles.lastAdminHint}>At least one admin must remain.</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showGroupSettingsModal} transparent animationType="slide" onRequestClose={() => setShowGroupSettingsModal(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowGroupSettingsModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.settingsSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Edit group details</Text>
            <Text style={styles.sheetSubtitle}>Update group display picture and about</Text>

            <View style={styles.groupPictureSection}>
              <View style={styles.groupPicturePreviewWrap}>
                {groupPictureDraft ? (
                  <Image source={{ uri: groupPictureDraft }} style={styles.groupPicturePreview} />
                ) : (
                  <View style={[styles.groupPicturePreview, styles.groupPictureFallback]}>
                    <Text style={styles.groupPictureFallbackEmoji}>{groupEmoji}</Text>
                  </View>
                )}
              </View>

              <View style={styles.groupPictureActions}>
                <TouchableOpacity
                  style={styles.groupPictureActionBtn}
                  onPress={handlePickGroupDisplayPicture}
                  disabled={isUploadingGroupPicture}
                >
                  {isUploadingGroupPicture ? (
                    <ActivityIndicator size="small" color="#111b21" />
                  ) : (
                    <>
                      <Ionicons name="image-outline" size={16} color="#111b21" />
                      <Text style={styles.groupPictureActionText}>Choose photo</Text>
                    </>
                  )}
                </TouchableOpacity>

                {groupPictureDraft ? (
                  <TouchableOpacity
                    style={styles.groupPictureActionBtn}
                    onPress={() => setGroupPictureDraft(null)}
                    disabled={isUploadingGroupPicture}
                  >
                    <Ionicons name="trash-outline" size={16} color="#111b21" />
                    <Text style={styles.groupPictureActionText}>Remove photo</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <Text style={styles.settingsFieldLabel}>Group about</Text>
            <TextInput
              value={groupAboutDraft}
              onChangeText={setGroupAboutDraft}
              placeholder="Tell members what this group is about"
              placeholderTextColor="#8b97a0"
              style={styles.groupAboutInput}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={280}
              selectionColor={theme.accent}
            />

            <TouchableOpacity
              style={styles.saveSettingsButton}
              onPress={handleSaveGroupSettings}
              disabled={isSavingGroupSettings || isUploadingGroupPicture}
            >
              {isSavingGroupSettings ? (
                <ActivityIndicator size="small" color={BaseColors.white} />
              ) : (
                <Text style={styles.saveSettingsButtonText}>Save changes</Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={Boolean(selectedMessageAction)} transparent animationType="fade" onRequestClose={() => setSelectedMessageAction(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSelectedMessageAction(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.messageActionSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Message actions</Text>
            <Text style={styles.sheetSubtitle} numberOfLines={2}>{selectedMessageAction?.preview}</Text>

            <View style={styles.quickReactionRow}>
              {QUICK_REACTION_OPTIONS.map((reaction) => {
                const isActive = selectedMessageAction?.currentReaction === reaction;

                return (
                  <TouchableOpacity
                    key={reaction}
                    style={[styles.quickReactionChip, isActive && styles.quickReactionChipActive]}
                    onPress={() => {
                      if (selectedMessageAction) {
                        handleToggleReaction(selectedMessageAction.id, reaction);
                      }
                      setSelectedMessageAction(null);
                    }}
                  >
                    <Text style={styles.quickReactionEmoji}>{reaction}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.messageActionRow}
              onPress={() => {
                if (selectedMessageAction) {
                  setReplyTarget(selectedMessageAction);
                }
                setSelectedMessageAction(null);
              }}
            >
              <Ionicons name="return-up-back-outline" size={18} color="#111b21" />
              <Text style={styles.messageActionText}>Reply</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.messageActionRow} onPress={handleCopyMessage}>
              <Ionicons name="copy-outline" size={18} color="#111b21" />
              <Text style={styles.messageActionText}>Copy text</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={Boolean(selectedImageViewer)} transparent animationType="fade" onRequestClose={() => setSelectedImageViewer(null)}>
        <View style={styles.imageViewerBackdrop}>
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={() => setSelectedImageViewer(null)}
            accessibilityRole="button"
            accessibilityLabel="Close fullscreen image"
          >
            <Ionicons name="close" size={28} color={BaseColors.white} />
          </TouchableOpacity>

          {selectedImageViewer ? (
            <>
              <TouchableOpacity style={styles.imageViewerContent} activeOpacity={1} onPress={() => setSelectedImageViewer(null)}>
                <Image source={{ uri: selectedImageViewer.uri }} style={styles.fullscreenImage} resizeMode="contain" />
              </TouchableOpacity>
              {selectedImageViewer.caption ? (
                <View style={styles.imageViewerCaptionWrap}>
                  <Text style={styles.imageViewerCaption}>{selectedImageViewer.caption}</Text>
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4efe8' },
  swipeableContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  replyIconContainer: {
    position: 'absolute',
    left: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  chatBackground: { flex: 1 },
  chatNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: BaseColors.brown900,
  },
  backBtn: { padding: 4 },
  groupAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  groupAvatarImage: { width: '100%', height: '100%', borderRadius: 18 },
  groupAvatarEmoji: { fontSize: 18 },
  groupInfo: { flex: 1, marginLeft: 10 },
  groupName: { fontFamily: Typography.sansSemiBold, fontSize: 16, color: BaseColors.white },
  onlineText: { fontFamily: Typography.sansMedium, fontSize: 12, color: 'rgba(255,255,255,0.72)' },
  navActions: { flexDirection: 'row', alignItems: 'center' },
  navIconBtn: { padding: 10 },
  navIconBtnDisabled: { opacity: 0.55 },
  pendingAttachmentBar: { paddingHorizontal: 12, paddingTop: 10 },
  pendingAttachmentChip: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pendingAttachmentPreview: { width: 36, height: 36, borderRadius: 10 },
  pendingAttachmentText: { flex: 1, fontFamily: Typography.sansMedium, fontSize: 12, color: '#111b21' },
  replyPreviewBar: {
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  replyAccent: { width: 3, alignSelf: 'stretch', borderRadius: 999 },
  replyPreviewCopy: { flex: 1 },
  replyPreviewName: { fontFamily: Typography.sansSemiBold, fontSize: 12, marginBottom: 2 },
  replyPreviewText: { fontFamily: Typography.sans, fontSize: 12 },
  messagesList: { paddingHorizontal: 12, paddingVertical: 12 },
  dateHeader: { alignItems: 'center', marginVertical: 14 },
  datePill: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  dateText: { fontSize: 12, color: '#54656f', textTransform: 'uppercase', fontFamily: Typography.sansSemiBold },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4, marginTop: 4 },
  msgRowOut: { justifyContent: 'flex-end' },
  msgAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  msgAvatarText: { color: BaseColors.white, fontFamily: Typography.sansSemiBold, fontSize: 11 },
  msgAvatarSpacer: { width: 38 },
  bubbleShell: { maxWidth: '82%' },
  bubble: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  bubbleIn: { backgroundColor: '#ffffff', borderTopLeftRadius: 6 },
  bubbleOut: { backgroundColor: '#d9fdd3', borderTopRightRadius: 6 },
  bubbleInTailHidden: { borderTopLeftRadius: 18 },
  bubbleOutTailHidden: { borderTopRightRadius: 18 },
  senderHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  msgSenderName: { fontFamily: Typography.sansSemiBold, fontSize: 12 },
  verifyBadge: { marginLeft: 4 },
  messageContentRow: { flexDirection: 'column' },
  replySnippet: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  replySnippetIn: { backgroundColor: '#f3f5f7' },
  replySnippetOut: { backgroundColor: 'rgba(255,255,255,0.45)' },
  replySnippetName: { fontFamily: Typography.sansSemiBold, fontSize: 12, marginBottom: 2 },
  replySnippetText: { fontFamily: Typography.sans, fontSize: 12, color: '#54656f', lineHeight: 17 },
  imageMessageWrap: { gap: 8 },
  chatImage: { width: 220, height: 220, borderRadius: 14, backgroundColor: '#d9d9d9' },
  bubbleText: { fontFamily: Typography.sans, fontSize: 15, color: '#111b21', lineHeight: 21 },
  bubbleTextOut: { color: '#122116' },
  messageMeta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 2 },
  msgTimePill: { fontSize: 10, color: '#667781' },
  statusCheck: { marginLeft: 3 },
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    paddingLeft: 2,
  },
  reactionRowOut: { justifyContent: 'flex-end' },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(17,27,33,0.08)',
  },
  reactionChipActive: {
    backgroundColor: '#e7f3ff',
    borderColor: '#8dc4ff',
  },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { fontFamily: Typography.sansSemiBold, fontSize: 11, color: '#4a5a63' },
  typingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#8d9fa8',
  },
  typingText: {
    fontFamily: Typography.sans,
    fontSize: 12,
    color: '#8d9fa8',
    fontStyle: 'italic',
  },
  offlineNotice: {
    backgroundColor: 'rgba(34, 47, 62, 0.78)',
    marginHorizontal: 12,
    marginTop: 10,
    paddingVertical: 7,
    borderRadius: 999,
    alignItems: 'center',
  },
  offlineNoticeText: { color: '#fff', fontSize: 11, fontFamily: Typography.sansMedium },
  scrollToBottomBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 1,
    zIndex: 10,
  },
  newMessagesBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#fff',
    zIndex: 11,
  },
  composerArea: {
    backgroundColor: 'transparent',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  bottomBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingBottom: 12, paddingTop: 6 },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 26,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 6,
    marginRight: 8,
    minHeight: 52,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emojiBtn: { padding: 5 },
  textInput: { flex: 1, fontFamily: Typography.sans, fontSize: 16, color: '#111b21', paddingHorizontal: 8, paddingTop: 10, maxHeight: 100 },
  attachBtn: { padding: 5 },
  cameraBtn: { padding: 5 },
  sendBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  imageViewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' },
  imageViewerClose: { position: 'absolute', top: 54, right: 20, zIndex: 10, padding: 6 },
  imageViewerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingTop: 40, paddingBottom: 90 },
  fullscreenImage: { width: '100%', height: '100%' },
  imageViewerCaptionWrap: { position: 'absolute', left: 16, right: 16, bottom: 28, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  imageViewerCaption: { color: BaseColors.white, fontFamily: Typography.sans, fontSize: 14, textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  bottomSheet: {
    backgroundColor: BaseColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  membersSheet: {
    backgroundColor: BaseColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    maxHeight: '70%',
  },
  settingsSheet: {
    backgroundColor: BaseColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '78%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(17,27,33,0.15)',
    marginBottom: 14,
  },
  sheetTitle: { fontFamily: Typography.sansSemiBold, fontSize: 16, color: '#111b21', marginBottom: 6 },
  sheetSubtitle: { fontFamily: Typography.sans, fontSize: 12, color: '#667781', marginBottom: 16 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  emojiItem: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f5f7f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: { fontSize: 24 },
  membersList: { maxHeight: '100%' },
  membersListContent: { gap: 12 },
  groupAboutCard: {
    backgroundColor: '#f4f6f8',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  groupAboutLabel: {
    fontFamily: Typography.sansSemiBold,
    fontSize: 12,
    color: '#54656f',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  groupAboutText: {
    fontFamily: Typography.sans,
    fontSize: 14,
    color: '#111b21',
    lineHeight: 20,
  },
  groupEditButton: {
    backgroundColor: '#eef4f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  groupEditButtonText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: 13,
    color: '#111b21',
  },
  adminPanelCard: {
    backgroundColor: '#f8fafb',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dce5eb',
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  adminPanelTitle: {
    fontFamily: Typography.sansSemiBold,
    fontSize: 13,
    color: '#111b21',
    textTransform: 'uppercase',
  },
  adminSection: {
    gap: 8,
  },
  adminSectionTitle: {
    fontFamily: Typography.sansSemiBold,
    fontSize: 13,
    color: '#111b21',
  },
  adminSearchInput: {
    borderWidth: 1,
    borderColor: '#d5dde3',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: Typography.sans,
    fontSize: 13,
    color: '#111b21',
  },
  adminEmptyText: {
    fontFamily: Typography.sans,
    fontSize: 12,
    color: '#667781',
  },
  manageRequestsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#dce5eb',
  },
  manageRequestsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  manageRequestsText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: 14,
    color: '#111b21',
  },
  manageRequestsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestsBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  requestsBadgeText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: 10,
    color: '#fff',
  },
  adminRequestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  adminRequestName: {
    flex: 1,
    fontFamily: Typography.sansMedium,
    fontSize: 13,
    color: '#111b21',
  },
  adminRequestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminApproveBtn: {
    minWidth: 68,
    backgroundColor: '#075E54',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminRejectBtn: {
    minWidth: 68,
    backgroundColor: '#eef3f6',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminActionBtnText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: 12,
    color: BaseColors.white,
  },
  adminRejectBtnText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: 12,
    color: '#111b21',
  },
  groupPictureSection: {
    marginTop: 4,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupPicturePreviewWrap: {
    width: 72,
    height: 72,
  },
  groupPicturePreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  groupPictureFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e3ece6',
  },
  groupPictureFallbackEmoji: {
    fontSize: 30,
  },
  groupPictureActions: {
    flex: 1,
    gap: 8,
  },
  groupPictureActionBtn: {
    backgroundColor: '#f3f5f7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  groupPictureActionText: {
    fontFamily: Typography.sansMedium,
    fontSize: 13,
    color: '#111b21',
  },
  settingsFieldLabel: {
    fontFamily: Typography.sansSemiBold,
    fontSize: 13,
    color: '#111b21',
    marginBottom: 8,
  },
  groupAboutInput: {
    borderWidth: 1,
    borderColor: '#d5dde3',
    borderRadius: 12,
    minHeight: 96,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: Typography.sans,
    fontSize: 14,
    color: '#111b21',
    marginBottom: 14,
  },
  saveSettingsButton: {
    backgroundColor: '#075E54',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveSettingsButtonText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: 14,
    color: BaseColors.white,
  },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { color: BaseColors.white, fontFamily: Typography.sansSemiBold, fontSize: 14 },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { fontFamily: Typography.sansSemiBold, fontSize: 14, color: '#111b21' },
  memberAdminBadge: {
    backgroundColor: '#e8f0fe',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  memberAdminBadgeText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: 10,
    color: '#1a56db',
    textTransform: 'uppercase',
  },
  memberSubtext: { fontFamily: Typography.sans, fontSize: 12, color: '#667781', marginTop: 2 },
  makeAdminButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#eef3f6',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 88,
    alignItems: 'center',
  },
  makeAdminButtonText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: 11,
    color: '#111b21',
    textTransform: 'uppercase',
  },
  removeAdminButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#fde8e8',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 96,
    alignItems: 'center',
  },
  removeAdminButtonText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: 11,
    color: '#b91c1c',
    textTransform: 'uppercase',
  },
  lastAdminHint: {
    marginTop: 6,
    fontFamily: Typography.sans,
    fontSize: 11,
    color: '#b45309',
  },
  messageActionSheet: {
    backgroundColor: BaseColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  quickReactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quickReactionChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f7f8',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  quickReactionChipActive: {
    backgroundColor: '#e7f3ff',
    borderColor: '#8dc4ff',
  },
  quickReactionEmoji: { fontSize: 21 },
  messageActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  messageActionText: {
    fontFamily: Typography.sansMedium,
    fontSize: 15,
    color: '#111b21',
  },
});
