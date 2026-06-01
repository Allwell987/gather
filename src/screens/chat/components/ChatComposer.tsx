// src/screens/chat/components/ChatComposer.tsx
import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseColors } from '../../../constants/theme';

interface ChatComposerProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSend: () => void;
  onAttach: () => void;
  onCamera: () => void;
  onEmoji: () => void;
  isSending: boolean;
  hasComposerContent: boolean;
  pendingAttachment?: { uri: string; sourceLabel: string } | null;
  onRemoveAttachment: () => void;
  replyTarget?: { senderName: string; preview: string } | null;
  onRemoveReply: () => void;
  editingMessageId?: string | null;
  onCancelEdit: () => void;
  accentColor: string;
  colors: any;
  insets: any;
  isKeyboardVisible: boolean;
}

export const ChatComposer = ({
  inputText,
  setInputText,
  onSend,
  onAttach,
  onCamera,
  onEmoji,
  isSending,
  hasComposerContent,
  pendingAttachment,
  onRemoveAttachment,
  replyTarget,
  onRemoveReply,
  editingMessageId,
  onCancelEdit,
  accentColor,
  colors,
  insets,
  isKeyboardVisible,
}: ChatComposerProps) => {
  return (
    <View style={[styles.composerArea, { backgroundColor: colors.surface }]}>
      {editingMessageId ? (
        <View style={[styles.replyPreviewBar, { backgroundColor: '#fffbe6', borderColor: '#ffe58f' }]}>
          <View style={[styles.replyAccent, { backgroundColor: '#faad14' }]} />
          <View style={styles.replyPreviewCopy}>
            <Text style={[styles.replyPreviewName, { color: '#faad14' }]}>Editing message</Text>
            <Text style={[styles.replyPreviewText, { color: colors.textSecondary }]} numberOfLines={1}>Tap the checkmark to save changes</Text>
          </View>
          <TouchableOpacity onPress={onCancelEdit}>
            <Ionicons name="close" size={18} color="#faad14" />
          </TouchableOpacity>
        </View>
      ) : null}

      {pendingAttachment ? (
        <View style={styles.pendingAttachmentBar}>
          <View style={[styles.pendingAttachmentChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image source={{ uri: pendingAttachment.uri }} style={styles.pendingAttachmentPreview} />
            <Text style={[styles.pendingAttachmentText, { color: colors.text }]} numberOfLines={1}>{pendingAttachment.sourceLabel}</Text>
            <TouchableOpacity onPress={onRemoveAttachment}>
              <Ionicons name="close-circle" size={18} color="#667781" />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {replyTarget ? (
        <View style={[styles.replyPreviewBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.replyAccent, { backgroundColor: accentColor }]} />
          <View style={styles.replyPreviewCopy}>
            <Text style={[styles.replyPreviewName, { color: accentColor }]}>{replyTarget.senderName}</Text>
            <Text style={[styles.replyPreviewText, { color: colors.textSecondary }]} numberOfLines={1}>{replyTarget.preview}</Text>
          </View>
          <TouchableOpacity onPress={onRemoveReply}>
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[styles.bottomBar, { paddingBottom: isKeyboardVisible ? 12 : Math.max(insets.bottom, 12) }]}>
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.emojiBtn} onPress={onEmoji}>
            <Ionicons name="happy-outline" size={24} color="#85959f" />
          </TouchableOpacity>
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message"
            placeholderTextColor="#85959f"
            multiline
            blurOnSubmit={false}
            selectionColor={accentColor}
          />
          <TouchableOpacity style={styles.attachBtn} onPress={onAttach}>
            <Ionicons name="attach" size={24} color="#85959f" style={{ transform: [{ rotate: '45deg' }] }} />
          </TouchableOpacity>
          {!hasComposerContent && (
            <TouchableOpacity style={styles.cameraBtn} onPress={onCamera}>
              <Ionicons name="camera" size={24} color="#85959f" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: accentColor }]}
          onPress={onSend}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={BaseColors.white} />
          ) : (
            <Ionicons
              name={editingMessageId ? "checkmark" : (hasComposerContent ? "send" : "mic")}
              size={22}
              color={BaseColors.white}
              style={hasComposerContent && !editingMessageId && { marginLeft: 3 }}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  composerArea: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
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
  },
  pendingAttachmentPreview: { width: 36, height: 36, borderRadius: 10 },
  pendingAttachmentText: { flex: 1, fontSize: 12 },
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
  replyPreviewName: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  replyPreviewText: { fontSize: 12 },
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
  },
  emojiBtn: { padding: 5 },
  textInput: { flex: 1, fontSize: 16, paddingHorizontal: 8, paddingTop: 10, maxHeight: 100 },
  attachBtn: { padding: 5 },
  cameraBtn: { padding: 5 },
  sendBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
