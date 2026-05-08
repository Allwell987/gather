import React from 'react';
import {
  Modal, TouchableOpacity, View, Text, StyleSheet,
  TextInput, ScrollView, ActivityIndicator, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseColors, Typography } from '../../../constants/theme';
import { GroupMember } from '../hooks/useGroupMembers';

interface EmojiPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  options: string[];
}

export const EmojiPicker = ({ visible, onClose, onSelect, options }: EmojiPickerProps) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.bottomSheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Choose an emoji</Text>
        <View style={styles.emojiGrid}>
          {options.map((emoji) => (
            <TouchableOpacity key={emoji} style={styles.emojiItem} onPress={() => onSelect(emoji)}>
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

interface MessageActionTarget {
  id: string;
  senderName: string;
  preview: string;
  copyValue: string;
  currentReaction?: string | null;
  isMine: boolean;
}

interface MessageActionSheetProps {
  target: MessageActionTarget | null;
  onClose: () => void;
  onReaction: (reaction: string) => void;
  onReply: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  reactionOptions: string[];
}

export const MessageActionSheet = ({
  target,
  onClose,
  onReaction,
  onReply,
  onCopy,
  onEdit,
  onDelete,
  reactionOptions
}: MessageActionSheetProps) => (
  <Modal visible={Boolean(target)} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.messageActionSheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Message actions</Text>
        <Text style={styles.sheetSubtitle} numberOfLines={2}>{target?.preview}</Text>

        <View style={styles.quickReactionRow}>
          {reactionOptions.map((reaction) => (
            <TouchableOpacity
              key={reaction}
              style={[styles.quickReactionChip, target?.currentReaction === reaction && styles.quickReactionChipActive]}
              onPress={() => onReaction(reaction)}
            >
              <Text style={styles.quickReactionEmoji}>{reaction}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.messageActionRow} onPress={onReply}>
          <Ionicons name="return-up-back-outline" size={18} color="#111b21" />
          <Text style={styles.messageActionText}>Reply</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.messageActionRow} onPress={onCopy}>
          <Ionicons name="copy-outline" size={18} color="#111b21" />
          <Text style={styles.messageActionText}>Copy text</Text>
        </TouchableOpacity>

        {target?.isMine && (
          <>
            <TouchableOpacity style={styles.messageActionRow} onPress={onEdit}>
              <Ionicons name="create-outline" size={18} color="#111b21" />
              <Text style={styles.messageActionText}>Edit message</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.messageActionRow} onPress={onDelete}>
              <Ionicons name="trash-outline" size={18} color="#b91c1c" />
              <Text style={[styles.messageActionText, { color: '#b91c1c' }]}>Delete message</Text>
            </TouchableOpacity>
          </>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  bottomSheet: {
    backgroundColor: BaseColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  messageActionSheet: {
    backgroundColor: BaseColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
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
