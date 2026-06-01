import React from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseColors, Radius, Spacing, Typography } from '../../../constants/theme';

interface GroupHeroPreviewProps {
  groupName: string;
  groupEmoji: string;
  groupPictureUrl: string | null;
  isPrivate: boolean;
  isUploadingImage: boolean;
  theme: any;
  colors: any;
}

export const GroupHeroPreview: React.FC<GroupHeroPreviewProps> = ({
  groupName,
  groupEmoji,
  groupPictureUrl,
  isPrivate,
  isUploadingImage,
  theme,
  colors,
}) => {
  return (
    <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.heroPreviewRow}>
        <View style={styles.heroImage}>
          {isUploadingImage ? (
            <ActivityIndicator color={theme.accent} />
          ) : groupPictureUrl ? (
            <Image source={{ uri: groupPictureUrl }} style={StyleSheet.absoluteFill} />
          ) : (
            <Text style={styles.heroEmoji}>{groupEmoji}</Text>
          )}
        </View>
        <View style={styles.heroTextWrap}>
          <Text style={[styles.heroName, { color: groupName.trim() ? colors.text : colors.textMuted }]}>
            {groupName.trim() || 'New Group'}
          </Text>
          <View style={[styles.visibilityPill, { backgroundColor: isPrivate ? BaseColors.red500 + '12' : theme.accentLight }]}>
            <Ionicons name={isPrivate ? 'lock-closed' : 'globe-outline'} size={12} color={isPrivate ? BaseColors.red600 : theme.accent} />
            <Text style={[styles.visibilityText, { color: isPrivate ? BaseColors.red600 : theme.accent }]}>
              {isPrivate ? 'Private' : 'Public'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  heroPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  heroImage: {
    width: 86,
    height: 86,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BaseColors.brown100,
    overflow: 'hidden',
  },
  heroEmoji: {
    fontSize: 36,
  },
  heroTextWrap: {
    flex: 1,
    gap: Spacing.sm,
  },
  heroName: {
    fontFamily: Typography.serif,
    fontSize: Typography.sizes.lg,
  },
  visibilityPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  visibilityText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.xs,
  },
});
