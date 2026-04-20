import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import HeaderBar from '../../components/common/HeaderBar';
import { BaseColors, Radius, Spacing, Typography } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useToastStore } from '../../store/toastStore';
import {
  createChatGroup,
  generateChatGroupId,
} from '../../services/chatGroups';
import {
  getChatImageUploadErrorMessage,
  uploadChatImage,
} from '../../services/chatMedia';
import type { CommunityScreenNavigationProp } from '../../types/navigation';

const EMOJI_OPTIONS = ['👥', '📖', '🙏', '🔥', '🎶', '🤝', '🕊️', '🌿'];

export default function CreateGroupScreen() {
  const navigation = useNavigation<CommunityScreenNavigationProp>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { theme, colors } = useThemeStore();
  const { showToast } = useToastStore();

  const [groupName, setGroupName] = useState('');
  const [groupAbout, setGroupAbout] = useState('');
  const [groupEmoji, setGroupEmoji] = useState('👥');
  const [groupPictureUrl, setGroupPictureUrl] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [draftGroupId, setDraftGroupId] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canCreateGroups = Boolean(user?.id && user.is_verified);

  const trimmedGroupName = groupName.trim();
  const canSubmit = useMemo(
    () => Boolean(trimmedGroupName && canCreateGroups && !isSaving && !isUploadingImage),
    [trimmedGroupName, canCreateGroups, isSaving, isUploadingImage]
  );

  const ensureDraftGroupId = () => {
    const nextId = draftGroupId ?? generateChatGroupId(trimmedGroupName || 'group');

    if (!draftGroupId) {
      setDraftGroupId(nextId);
    }

    return nextId;
  };

  const handlePickPhoto = async () => {
    if (!user?.id) {
      showToast({
        title: 'Sign in required',
        message: 'Please sign in before creating a group.',
        variant: 'warning',
      });
      return;
    }

    if (!trimmedGroupName) {
      showToast({
        title: 'Add a group name first',
        message: 'We need the group name before uploading its display picture.',
        variant: 'warning',
      });
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      showToast({
        title: 'Library access needed',
        message: 'Allow photo library access to choose a group picture.',
        variant: 'warning',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
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
      setIsUploadingImage(true);

      const groupId = ensureDraftGroupId();
      const imageUrl = await uploadChatImage({
        userId: user.id,
        groupId,
        base64: asset.base64,
        contentType: asset.mimeType,
        fileName: asset.fileName,
        uploadKey: `group-avatar-${Date.now()}`,
      });

      setGroupPictureUrl(imageUrl);
      showToast({
        title: 'Picture uploaded',
        message: 'Your group picture is ready to be used at creation time.',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Upload failed',
        message: getChatImageUploadErrorMessage(error instanceof Error ? error.message : String(error)),
        variant: 'error',
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!user?.id) {
      showToast({
        title: 'Sign in required',
        message: 'Please sign in before creating a group.',
        variant: 'warning',
      });
      return;
    }

    if (!user.is_verified) {
      showToast({
        title: 'Verification required',
        message: 'Only verified members can create a new group.',
        variant: 'warning',
      });
      return;
    }

    if (!trimmedGroupName) {
      showToast({
        title: 'Group name required',
        message: 'Give the fellowship a clear name before continuing.',
        variant: 'warning',
      });
      return;
    }

    try {
      setIsSaving(true);

      const createdGroup = await createChatGroup({
        id: ensureDraftGroupId(),
        name: trimmedGroupName,
        createdBy: user.id,
        description: groupAbout,
        displayPictureUrl: groupPictureUrl,
        emoji: groupEmoji,
        isPrivate,
      });

      await queryClient.invalidateQueries({ queryKey: ['community-chat-groups'] });

      showToast({
        title: 'Group created',
        message: 'Your fellowship is live and ready for conversation.',
        variant: 'success',
      });

      navigation.navigate('HomeTab', {
        screen: 'GroupChat',
        params: { groupId: createdGroup.id, groupName: createdGroup.name },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const normalizedError = errorMessage.toLowerCase();
      const message = normalizedError.includes('row-level security') || normalizedError.includes('permission')
        ? 'Only verified members can create groups, and your account must have permission to upload the picture.'
        : errorMessage;

      showToast({
        title: 'Could not create group',
        message,
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <HeaderBar
        title="Create Group"
        subtitle="Set the picture and about before anyone joins."
        onBackPress={() => navigation.goBack()}
        enableBlur={true}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={styles.heroPreviewRow}>
              {groupPictureUrl ? (
                <Image source={{ uri: groupPictureUrl }} style={styles.heroImage} />
              ) : (
                <View style={[styles.heroImage, { backgroundColor: theme.accentSubtle }]}> 
                  <Text style={styles.heroEmoji}>{groupEmoji}</Text>
                </View>
              )}

              <View style={styles.heroTextWrap}>
                <Text style={[styles.heroName, { color: colors.text }]} numberOfLines={1}>
                  {trimmedGroupName || 'Your new fellowship'}
                </Text>
                <Text style={[styles.heroMeta, { color: colors.textSecondary }]} numberOfLines={2}>
                  {groupAbout.trim() || 'Add a short description so people know what this group is for.'}
                </Text>
                <View style={[styles.visibilityPill, { backgroundColor: isPrivate ? BaseColors.brown100 : theme.accentSubtle }]}> 
                  <Ionicons name={isPrivate ? 'lock-closed-outline' : 'globe-outline'} size={14} color={isPrivate ? BaseColors.brown700 : theme.accentDeep} />
                  <Text style={[styles.visibilityText, { color: isPrivate ? BaseColors.brown700 : theme.accentDeep }]}>
                    {isPrivate ? 'Private group' : 'Public group'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {!canCreateGroups ? (
            <View style={[styles.noticeCard, { backgroundColor: BaseColors.warm100, borderColor: BaseColors.brown200 }]}> 
              <Ionicons name="shield-checkmark-outline" size={18} color={BaseColors.brown700} />
              <Text style={styles.noticeText}>Group creation is limited to verified members by the current church policy.</Text>
            </View>
          ) : null}

          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Details</Text>

            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Group name</Text>
              <TextInput
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Young Professionals Prayer Circle"
                placeholderTextColor={colors.textMuted}
                selectionColor={theme.accent}
                style={[
                  styles.textInput,
                  { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
                ]}
                maxLength={60}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>About</Text>
              <TextInput
                value={groupAbout}
                onChangeText={setGroupAbout}
                placeholder="What kind of fellowship is this for?"
                placeholderTextColor={colors.textMuted}
                selectionColor={theme.accent}
                style={[
                  styles.textArea,
                  { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
                ]}
                multiline
                textAlignVertical="top"
                maxLength={180}
              />
              <Text style={[styles.fieldHint, { color: colors.textMuted }]}>{groupAbout.trim().length}/180</Text>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Picture</Text>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.accent }]}
                  onPress={handlePickPhoto}
                  activeOpacity={0.85}
                  disabled={isUploadingImage || isSaving}
                >
                  {isUploadingImage ? (
                    <ActivityIndicator size="small" color={BaseColors.white} />
                  ) : (
                    <>
                      <Ionicons name="image-outline" size={16} color={BaseColors.white} />
                      <Text style={styles.actionButtonText}>{groupPictureUrl ? 'Replace photo' : 'Choose photo'}</Text>
                    </>
                  )}
                </TouchableOpacity>

                {groupPictureUrl ? (
                  <TouchableOpacity
                    style={[styles.secondaryActionButton, { borderColor: colors.border, backgroundColor: colors.background }]}
                    onPress={() => setGroupPictureUrl(null)}
                    activeOpacity={0.85}
                    disabled={isUploadingImage || isSaving}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.text} />
                    <Text style={[styles.secondaryActionText, { color: colors.text }]}>Remove</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Style</Text>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Choose an emoji</Text>
            <View style={styles.emojiGrid}>
              {EMOJI_OPTIONS.map((emoji) => {
                const isSelected = groupEmoji === emoji;

                return (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.emojiChip,
                      {
                        backgroundColor: isSelected ? theme.accentSubtle : colors.background,
                        borderColor: isSelected ? theme.accent : colors.border,
                      },
                    ]}
                    onPress={() => setGroupEmoji(emoji)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emojiChipText}>{emoji}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.privacyRow, { borderTopColor: colors.border }]}> 
              <View style={styles.privacyCopy}>
                <Text style={[styles.privacyTitle, { color: colors.text }]}>Require approval to join</Text>
                <Text style={[styles.privacySubtitle, { color: colors.textSecondary }]}>Private groups create join requests instead of letting people enter directly.</Text>
              </View>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ false: colors.border, true: theme.accentBorder }}
                thumbColor={isPrivate ? theme.accent : BaseColors.white}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: canSubmit ? theme.accent : colors.border },
            ]}
            onPress={handleCreateGroup}
            activeOpacity={0.85}
            disabled={!canSubmit}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={BaseColors.white} />
            ) : (
              <Text style={styles.submitButtonText}>Create group</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  headerShell: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerCopy: { flex: 1, gap: 2 },
  headerTitle: {
    fontFamily: Typography.serif,
    fontSize: Typography.sizes.xl,
    color: BaseColors.white,
  },
  headerSubtitle: {
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.72)',
  },
  content: {
    padding: Spacing.xl,
    gap: Spacing.lg,
    paddingBottom: Spacing['4xl'],
  },
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
  heroMeta: {
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.sm,
    lineHeight: 18,
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
  noticeCard: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  noticeText: {
    flex: 1,
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.sm,
    lineHeight: 18,
    color: BaseColors.brown700,
  },
  sectionCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.md,
  },
  fieldBlock: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.sm,
  },
  textInput: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.md,
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.md,
  },
  fieldHint: {
    alignSelf: 'flex-end',
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.xs,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionButton: {
    minHeight: 46,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.sm,
    color: BaseColors.white,
  },
  secondaryActionButton: {
    minHeight: 46,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  secondaryActionText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.sm,
  },
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
  privacyRow: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  privacyCopy: {
    flex: 1,
    gap: 4,
  },
  privacyTitle: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.sm,
  },
  privacySubtitle: {
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.sm,
    lineHeight: 18,
  },
  submitButton: {
    minHeight: 54,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  submitButtonText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.md,
    color: BaseColors.white,
  },
});