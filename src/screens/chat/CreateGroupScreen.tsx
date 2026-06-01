import React from 'react';
import {
  ActivityIndicator,
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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import HeaderBar from '../../components/common/HeaderBar';
import { BaseColors, Radius, Spacing, Typography } from '../../constants/theme';
import { useThemeStore } from '../../store/themeStore';
import { useCreateGroup } from '../../hooks/useCreateGroup';
import { GroupHeroPreview } from './components/GroupHeroPreview';
import { EmojiPicker } from './components/EmojiPicker';
import type { CommunityScreenNavigationProp } from '../../types/navigation';

export default function CreateGroupScreen() {
  const navigation = useNavigation<CommunityScreenNavigationProp>();
  const { theme, colors } = useThemeStore();
  const {
    groupName,
    setGroupName,
    groupAbout,
    setGroupAbout,
    groupEmoji,
    setGroupEmoji,
    groupPictureUrl,
    isPrivate,
    setIsPrivate,
    isUploadingImage,
    isSaving,
    canCreateGroups,
    canSubmit,
    handlePickPhoto,
    handleCreateGroup,
  } = useCreateGroup();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerShell, { backgroundColor: BaseColors.brown900 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="close" size={24} color={BaseColors.white} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>New Community</Text>
            <Text style={styles.headerSubtitle}>Bring people together for God</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <GroupHeroPreview
            groupName={groupName}
            groupEmoji={groupEmoji}
            groupPictureUrl={groupPictureUrl}
            isPrivate={isPrivate}
            isUploadingImage={isUploadingImage}
            theme={theme}
            colors={colors}
          />

          {!canCreateGroups && (
            <View style={[styles.noticeCard, { backgroundColor: BaseColors.red500 + '08', borderColor: BaseColors.red500 + '24' }]}>
              <Ionicons name="alert-circle" size={20} color={BaseColors.red600} />
              <Text style={styles.noticeText}>
                Only verified members can create new groups. Complete your profile verification to start a community.
              </Text>
            </View>
          )}

          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Identity</Text>

            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Group Name</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={groupName}
                onChangeText={setGroupName}
                placeholder="e.g. Wednesday Morning Prayer"
                placeholderTextColor={colors.textMuted}
                maxLength={40}
              />
              <Text style={[styles.fieldHint, { color: colors.textMuted }]}>{groupName.length}/40</Text>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>About the Community</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={groupAbout}
                onChangeText={setGroupAbout}
                placeholder="What is this group for? How can members participate?"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={240}
              />
              <Text style={[styles.fieldHint, { color: colors.textMuted }]}>{groupAbout.length}/240</Text>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Group Photo</Text>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.secondaryActionButton, { borderColor: theme.accent }]}
                  onPress={handlePickPhoto}
                  disabled={isUploadingImage}
                >
                  <Ionicons name="image-outline" size={18} color={theme.accent} />
                  <Text style={[styles.secondaryActionText, { color: theme.accent }]}>
                    {groupPictureUrl ? 'Change Photo' : 'Upload Photo'}
                  </Text>
                </TouchableOpacity>

                {groupPictureUrl && (
                  <TouchableOpacity
                    style={[styles.secondaryActionButton, { borderColor: BaseColors.red500 }]}
                    onPress={() => {/* reset */}}
                  >
                    <Ionicons name="trash-outline" size={18} color={BaseColors.red500} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Visual & Privacy</Text>

            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Choose an Icon</Text>
              <EmojiPicker
                selectedEmoji={groupEmoji}
                onSelect={setGroupEmoji}
                theme={theme}
                colors={colors}
              />
            </View>

            <View style={[styles.privacyRow, { borderTopColor: colors.border }]}>
              <View style={styles.privacyCopy}>
                <Text style={[styles.privacyTitle, { color: colors.text }]}>Private Community</Text>
                <Text style={[styles.privacySubtitle, { color: colors.textSecondary }]}>
                  Members must be invited or approved by an admin to join.
                </Text>
              </View>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ false: colors.border, true: theme.accent }}
                thumbColor={BaseColors.white}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: canSubmit ? theme.accent : colors.border },
            ]}
            onPress={handleCreateGroup}
            disabled={!canSubmit}
          >
            {isSaving ? (
              <ActivityIndicator color={BaseColors.white} />
            ) : (
              <Text style={styles.submitButtonText}>Create Community</Text>
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
