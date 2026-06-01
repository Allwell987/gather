import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Radius, Spacing, Typography } from '../../../constants/theme';

interface EmojiPickerProps {
  selectedEmoji: string;
  onSelect: (emoji: string) => void;
  theme: any;
  colors: any;
}

const EMOJI_OPTIONS = ['👥', '📖', '🙏', '🔥', '🎶', '🤝', '🕊️', '🌿'];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  selectedEmoji,
  onSelect,
  theme,
  colors,
}) => {
  return (
    <View style={styles.emojiGrid}>
      {EMOJI_OPTIONS.map((emoji) => {
        const isSelected = selectedEmoji === emoji;
        return (
          <TouchableOpacity
            key={emoji}
            style={[
              styles.emojiChip,
              { borderColor: colors.border, backgroundColor: colors.background },
              isSelected && { backgroundColor: theme.accentLight, borderColor: theme.accent },
            ]}
            onPress={() => onSelect(emoji)}
          >
            <Text style={styles.emojiChipText}>{emoji}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  emojiChip: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiChipText: {
    fontSize: 24,
  },
});
