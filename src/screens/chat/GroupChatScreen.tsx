// src/screens/chat/GroupChatScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { HeaderBar } from '../../components/common';
import { Typography } from '../../constants/theme';
import { useQuery } from '@tanstack/react-query';
import { serializeChatImageMessage, uploadChatImage } from '../../services/chatMedia';
import { MessageBubble, type ChatMessage as Message } from './components/MessageBubble';
import { ChatComposer } from './components/ChatComposer';
import { supabase } from '../../services/supabase';
import { format, isSameDay } from 'date-fns';
import { useGroupChat } from './hooks/useGroupChat';
import { useGroupMembers } from './hooks/useGroupMembers';
import { EmojiPicker, MessageActionSheet } from './components/ChatModals';
import { t, getDeviceLocale } from '../../services/locale';
import type { HomeStackNavigationProp, GroupChatRouteProp } from '../../types/navigation';

const GROUP_META: Record<string, { emoji: string; membersLabel: string }> = {
  'young-adults': { emoji: '👨‍👩', membersLabel: '14 members' },
  'mens-bible-study': { emoji: '📖', membersLabel: '9 members' },
};

const EMOJI_OPTIONS = ['🙏', '🔥', '🙌', '❤️', '😊', '👏', '🎉', '📖', '⛪', '🤍'];
const QUICK_REACTION_OPTIONS = ['❤️', '🙏', '🔥', '👏', '😊'];

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
      if (event.translationX > 0) {
        translateX.value = event.translationX;
        if (event.translationX > SWIPE_THRESHOLD && !hasTriggered.value) {
          hasTriggered.value = true;
          runOnJS(() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); })();
        } else if (event.translationX < SWIPE_THRESHOLD && hasTriggered.value) {
          hasTriggered.value = false;
        }
      }
    })
    .onEnd(() => {
      if (translateX.value > SWIPE_THRESHOLD) runOnJS(onReply)();
      translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
      hasTriggered.value = false;
    });

  const rStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const iconStyle = useAnimatedStyle(() => ({
    opacity: translateX.value / SWIPE_THRESHOLD,
    transform: [{ scale: Math.min(translateX.value / SWIPE_THRESHOLD, 1.2) }],
  }));

  return (
    <View style={styles.swipeableContainer}>
      <Reanimated.View style={[styles.replyIconContainer, iconStyle]}>
        <Ionicons name="return-up-back" size={20} color="#667781" />
      </Reanimated.View>
      <GestureDetector gesture={gesture}>
        <Reanimated.View style={rStyle}>{children}</Reanimated.View>
      </GestureDetector>
    </View>
  );
};

export default function GroupChatScreen() {
  const navigation = useNavigation<HomeStackNavigationProp>();
  const route = useRoute<GroupChatRouteProp>();
  const locale = getDeviceLocale();
  const { theme, colors } = useThemeStore();
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const insets = useSafeAreaInsets();

  const groupId = route.params?.groupId ?? 'young-adults';
  const defaultGroupName = route.params?.groupName ?? 'Young Adults Fellowship';

  const {
    messages, sendMessage, isSending, toggleReaction,
    setTyping, markAsRead, deleteMsg, updateMsg
  } = useGroupChat(groupId, theme.accent);

  const { members: groupMembers } = useGroupMembers(groupId, theme.accent);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<any | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTarget, setReplyTarget] = useState<any | null>(null);
  const [selectedMessageAction, setSelectedMessageAction] = useState<any | null>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const { data: groupDetails } = useQuery<{ name: string; description: string } | null>({
    queryKey: ['chat-group-details', groupId],
    queryFn: async () => {
      const { data, error } = await supabase.from('chat_groups').select('name, description').eq('id', groupId).maybeSingle();
      if (error || !data) return null;
      return data as { name: string; description: string };
    },
  });

  const groupName = groupDetails?.name ?? defaultGroupName;
  const groupMembersLabel = `${groupMembers.length} ${groupMembers.length === 1 ? t('member', locale) : t('membersPlural', locale)}`;

  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    if (!user?.id || messages.length === 0) return;
    const unread = messages.filter(m => !m.isMine && !m.readBy?.includes(user.id)).map(m => m.id);
    if (unread.length > 0) markAsRead(unread);
  }, [messages, user?.id, markAsRead]);

  const onSendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed && !pendingAttachment) return;
    if (editingMessageId) {
      updateMsg(editingMessageId, trimmed);
      setEditingMessageId(null);
      setInputText('');
      return;
    }

    let content = trimmed;
    if (pendingAttachment) {
      try {
        setIsUploadingAttachment(true);
        const imageUrl = await uploadChatImage({
          userId: user!.id,
          groupId,
          base64: pendingAttachment.base64,
          contentType: pendingAttachment.mimeType,
          fileName: pendingAttachment.fileName,
        });
        content = serializeChatImageMessage({ imageUrl, caption: trimmed });
      } catch {
        showToast({ title: t('uploadFailed', locale), message: t('couldNotSendImage', locale), variant: 'error' });
        return;
      } finally { setIsUploadingAttachment(false); }
    }

    sendMessage({
      content,
      replyToMessageId: replyTarget?.id,
      replyMetadata: replyTarget ? { senderName: replyTarget.senderName, preview: replyTarget.preview } : undefined
    });
    setInputText('');
    setPendingAttachment(null);
    setReplyTarget(null);
    setTyping(false);
  };

  const handlePickAttachment = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, base64: true });
    if (result.canceled || !result.assets[0]?.base64) return;
    const asset = result.assets[0];
    setPendingAttachment({ uri: asset.uri, base64: asset.base64, mimeType: asset.mimeType, fileName: asset.fileName });
  }, []);

  const renderMessage = useCallback(({ item, index }: { item: Message, index: number }) => {
    const prevMsg = messages[index - 1];
    const isDifferentDay = !prevMsg || !isSameDay(new Date(prevMsg.created_at), new Date(item.created_at));
    const onReply = () => setReplyTarget({ id: item.id, senderName: item.senderName, preview: item.content.slice(0, 100) });

    return (
      <View>
        {isDifferentDay && (
          <View style={styles.dateHeader}>
            <View style={styles.datePill}>
              <Text style={styles.dateText}>{format(new Date(item.created_at), 'MMMM d, yyyy')}</Text>
            </View>
          </View>
        )}
        <SwipeableMessage onReply={onReply}>
          <MessageBubble
            message={item}
            showSenderMeta={!item.isMine && (!prevMsg || prevMsg.user_id !== item.user_id)}
            isSameSender={prevMsg?.user_id === item.user_id}
            onLongPress={(m) => setSelectedMessageAction({ id: m.id, senderName: m.senderName, preview: m.content.slice(0, 100), copyValue: m.content, isMine: m.isMine })}
            onImagePress={() => {}}
            onReactionPress={toggleReaction}
          />
        </SwipeableMessage>
      </View>
    );
  }, [messages, toggleReaction]);

  return (
    <View style={styles.container}>
      <HeaderBar
        title={groupName}
        subtitle={groupMembersLabel}
        onBackPress={() => navigation.goBack()}
        enableBlur
        rightAction={() => navigation.navigate('GroupInfo', { groupId, groupName })}
        rightIcon="ellipsis-vertical"
      />

      <View style={[styles.chatBackground, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={56 + insets.top}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={m => m.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => !showScrollToBottom && flatListRef.current?.scrollToEnd({ animated: true })}
              onScroll={e => setShowScrollToBottom(e.nativeEvent.contentOffset.y < e.nativeEvent.contentSize.height - e.nativeEvent.layoutMeasurement.height - 300)}
            />
          </TouchableWithoutFeedback>

          <ChatComposer
            inputText={inputText}
            setInputText={text => { setInputText(text); setTyping(text.length > 0); }}
            onSend={onSendMessage}
            onAttach={handlePickAttachment}
            onCamera={() => {}}
            onEmoji={() => setShowEmojiPicker(true)}
            isSending={isSending || isUploadingAttachment}
            hasComposerContent={Boolean(inputText || pendingAttachment)}
            pendingAttachment={pendingAttachment}
            onRemoveAttachment={() => setPendingAttachment(null)}
            replyTarget={replyTarget}
            onRemoveReply={() => setReplyTarget(null)}
            editingMessageId={editingMessageId}
            onCancelEdit={() => { setEditingMessageId(null); setInputText(''); }}
            accentColor={theme.accent}
            colors={colors}
            insets={insets}
            isKeyboardVisible={isKeyboardVisible}
          />
        </KeyboardAvoidingView>
      </View>

      <EmojiPicker
        visible={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSelect={emoji => { setInputText(p => p + emoji); setShowEmojiPicker(false); }}
        options={EMOJI_OPTIONS}
      />

      <MessageActionSheet
        target={selectedMessageAction}
        onClose={() => setSelectedMessageAction(null)}
        onReaction={r => { toggleReaction(selectedMessageAction.id, r); setSelectedMessageAction(null); }}
        onReply={() => { setReplyTarget(selectedMessageAction); setSelectedMessageAction(null); }}
        onCopy={() => { Clipboard.setStringAsync(selectedMessageAction.copyValue); setSelectedMessageAction(null); }}
        onEdit={() => { setEditingMessageId(selectedMessageAction.id); setInputText(selectedMessageAction.copyValue); setSelectedMessageAction(null); }}
        onDelete={() => { deleteMsg(selectedMessageAction.id); setSelectedMessageAction(null); }}
        reactionOptions={QUICK_REACTION_OPTIONS}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4efe8' },
  swipeableContainer: { position: 'relative', justifyContent: 'center' },
  replyIconContainer: { position: 'absolute', left: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center', zIndex: -1 },
  chatBackground: { flex: 1 },
  messagesList: { paddingHorizontal: 12, paddingVertical: 12, flexGrow: 1 },
  dateHeader: { alignItems: 'center', marginVertical: 14 },
  datePill: { backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, elevation: 1 },
  dateText: { fontSize: 12, color: '#54656f', textTransform: 'uppercase', fontFamily: Typography.sansSemiBold },
});
