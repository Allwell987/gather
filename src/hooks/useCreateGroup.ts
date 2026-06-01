import { useState, useMemo, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import {
  createChatGroup,
  generateChatGroupId,
} from '../services/chatGroups';
import {
  getChatImageUploadErrorMessage,
  uploadChatImage,
} from '../services/chatMedia';
import type { CommunityScreenNavigationProp } from '../types/navigation';

export const useCreateGroup = () => {
  const navigation = useNavigation<CommunityScreenNavigationProp>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
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

  const ensureDraftGroupId = useCallback(() => {
    const nextId = draftGroupId ?? generateChatGroupId(trimmedGroupName || 'group');
    if (!draftGroupId) {
      setDraftGroupId(nextId);
    }
    return nextId;
  }, [draftGroupId, trimmedGroupName]);

  const handlePickPhoto = async () => {
    if (!user?.id) {
      showToast({ title: 'Sign in required', message: 'Please sign in before creating a group.', variant: 'warning' });
      return;
    }

    if (!trimmedGroupName) {
      showToast({ title: 'Add a group name first', message: 'We need the group name before uploading its display picture.', variant: 'warning' });
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      showToast({ title: 'Library access needed', message: 'Allow photo library access to choose a group picture.', variant: 'warning' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets[0].base64) return;

    setIsUploadingImage(true);
    try {
      const groupId = ensureDraftGroupId();
      const imageUrl = await uploadChatImage({
        userId: user.id,
        groupId,
        base64: result.assets[0].base64,
        contentType: result.assets[0].mimeType,
        fileName: result.assets[0].fileName,
      });
      setGroupPictureUrl(imageUrl);
    } catch (error) {
      showToast({ title: 'Upload failed', message: getChatImageUploadErrorMessage(error instanceof Error ? error.message : String(error)), variant: 'error' });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!canSubmit || !user?.id) return;

    setIsSaving(true);
    try {
      const groupId = ensureDraftGroupId();
      await createChatGroup({
        id: groupId,
        name: trimmedGroupName,
        description: groupAbout.trim() || null,
        emoji: groupEmoji,
        displayPictureUrl: groupPictureUrl,
        isPrivate,
        createdBy: user.id,
      });

      await queryClient.invalidateQueries({ queryKey: ['chat-groups'] });
      showToast({ title: 'Group created', message: `"${trimmedGroupName}" is ready!`, variant: 'success' });
      navigation.goBack();
    } catch (error) {
      showToast({ title: 'Failed to create group', message: 'An unexpected error occurred. Please try again.', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return {
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
  };
};
