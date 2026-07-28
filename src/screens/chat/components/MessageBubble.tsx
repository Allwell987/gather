// src/screens/chat/components/MessageBubble.tsx
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Typography } from '../../../constants/theme';

export interface MessageReaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  group_id: string;
  content: string;
  reply_to_message_id?: string | null;
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
  reactions: MessageReaction[];
  readBy: string[];
  syncStatus?: 'pending';
  replySenderName?: string;
  replyPreview?: string;
}

interface MessageBubbleProps {
  message: ChatMessage;
  showSenderMeta: boolean;
  isSameSender: boolean;
  onLongPress: (message: ChatMessage) => void;
  onImagePress: (uri: string, caption?: string) => void;
  onReactionPress: (messageId: string, emoji: string) => void;
}

const MessageBubbleComponent = ({
  message,
  showSenderMeta,
  isSameSender,
  onLongPress,
  onImagePress,
  onReactionPress,
}: MessageBubbleProps) => {
  const { isMine, senderColor, senderName, verificationLevel, messageType, imageUrl, imageCaption, created_at, syncStatus, readBy, reactions, replySenderName, replyPreview } = message;

  return (
    <Animated.View entering={ZoomIn.duration(300)} style={[styles.msgRow, isMine && styles.msgRowOut, isSameSender && { marginTop: 2 }]}>
      {showSenderMeta ? (
        <View style={[styles.msgAvatar, { backgroundColor: senderColor }]}>
          <Text style={styles.msgAvatarText}>{message.senderInitials}</Text>
        </View>
      ) : !isMine ? (
        <View style={styles.msgAvatarSpacer} />
      ) : null}

      <TouchableOpacity
        activeOpacity={0.92}
        delayLongPress={220}
        onLongPress={() => onLongPress(message)}
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
              <Text style={[styles.msgSenderName, { color: senderColor }]}>{senderName}</Text>
              {verificationLevel === 'gold' && (
                <Ionicons name="checkmark-circle" size={12} color="#D4AF37" style={styles.verifyBadge} />
              )}
              {verificationLevel === 'black' && (
                <Ionicons name="checkmark-circle" size={12} color={isMine ? '#122116' : '#111b21'} style={styles.verifyBadge} />
              )}
            </View>
          )}

          <View style={styles.messageContentRow}>
            {messageType === 'image' && imageUrl ? (
              <View style={styles.imageMessageWrap}>
                {replyPreview ? (
                  <View style={[styles.replySnippet, isMine ? styles.replySnippetOut : styles.replySnippetIn]}>
                    <Text style={[styles.replySnippetName, { color: isMine ? '#1f5f3f' : senderColor }]}>
                      {replySenderName}
                    </Text>
                    <Text style={styles.replySnippetText} numberOfLines={2}>{replyPreview}</Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => onImagePress(imageUrl, imageCaption)}
                >
                  <Image source={{ uri: imageUrl }} style={styles.chatImage} resizeMode="cover" />
                </TouchableOpacity>
                {imageCaption ? (
                  <Text style={[styles.bubbleText, isMine && styles.bubbleTextOut]}>
                    {imageCaption}
                  </Text>
                ) : null}
              </View>
            ) : (
              <>
                {replyPreview ? (
                  <View style={[styles.replySnippet, isMine ? styles.replySnippetOut : styles.replySnippetIn]}>
                    <Text style={[styles.replySnippetName, { color: isMine ? '#1f5f3f' : senderColor }]}>
                      {replySenderName}
                    </Text>
                    <Text style={styles.replySnippetText} numberOfLines={2}>{replyPreview}</Text>
                  </View>
                ) : null}
                <Text style={[styles.bubbleText, isMine && styles.bubbleTextOut]}>
                  {message.content}
                </Text>
              </>
            )}

            <View style={styles.messageMeta}>
              {new Date(message.updated_at).getTime() - new Date(created_at).getTime() > 60000 && (
                <Text style={styles.editedText}>Edited</Text>
              )}
              <Text style={styles.msgTimePill}>
                {format(new Date(created_at), 'h:mm a')}
              </Text>
              {isMine && (
                <Ionicons
                  name={
                    syncStatus === 'pending'
                      ? 'time-outline'
                      : (readBy ?? []).length > 0
                      ? 'checkmark-done'
                      : 'checkmark'
                  }
                  size={14}
                  color={
                    syncStatus === 'pending'
                      ? '#999'
                      : (readBy ?? []).length > 0
                      ? '#34B7F1'
                      : '#aab7bf'
                  }
                  style={styles.statusCheck}
                />
              )}
            </View>
          </View>
        </View>

        {(reactions ?? []).length > 0 ? (
          <View style={[styles.reactionRow, isMine && styles.reactionRowOut]}>
            {(reactions ?? []).map((reactionEntry) => (
              <TouchableOpacity
                key={reactionEntry.emoji}
                activeOpacity={0.88}
                style={[
                  styles.reactionChip,
                  reactionEntry.reactedByMe && styles.reactionChipActive,
                ]}
                onPress={() => onReactionPress(message.id, reactionEntry.emoji)}
              >
                <Text style={styles.reactionEmoji}>{reactionEntry.emoji}</Text>
                <Text style={styles.reactionCount}>{reactionEntry.count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
};

MessageBubbleComponent.displayName = 'MessageBubble';

export const MessageBubble = React.memo(MessageBubbleComponent);

const styles = StyleSheet.create({
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
  msgAvatarText: { color: '#fff', fontFamily: Typography.sansSemiBold, fontSize: 11 },
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
  bubbleText: { fontFamily: Typography.sans, fontSize: 15, color: '#1a365d', lineHeight: 21 },
  bubbleTextOut: { color: '#122116' },
  messageMeta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 2, gap: 4 },
  editedText: { fontSize: 10, color: '#667781', fontStyle: 'italic' },
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
});
