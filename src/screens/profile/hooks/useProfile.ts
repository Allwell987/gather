import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../../store/authStore';
import { useToastStore } from '../../../store/toastStore';
import { supabase } from '../../../services/supabase';
import {
  updateProfile as updateProfileApi,
  uploadProfileAvatar,
  uploadVerificationCertificate
} from '../../../services/profile';
import {
  scheduleDailyVerseNotification,
  cancelDailyVerseNotifications
} from '../../../services/notifications';
import { fetchDailyVerse } from '../../../services/dailyVerse';
import { getFriendlyErrorMessage } from '../../../services/errorMapping';

export function useProfile() {
  const { user, setUser, signOut } = useAuthStore();
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const { data: verificationData } = useQuery({
    queryKey: ['verificationStatus', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('verification_requests')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const hasPendingVerification = (verificationData as any)?.status === 'pending';

  const handlePickAvatar = async () => {
    if (!user) return;

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      showToast({ title: 'Permission required', message: 'Library access needed to change avatar.', variant: 'warning' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0].base64) return;

    setIsSaving(true);
    try {
      const avatarUrl = await uploadProfileAvatar({
        userId: user.id,
        base64: result.assets[0].base64,
        contentType: result.assets[0].mimeType,
      });

      const updated = await updateProfileApi(user.id, { avatar_url: avatarUrl });
      setUser(updated);
      showToast({ title: 'Success', message: 'Avatar updated.', variant: 'success' });
    } catch (error) {
      showToast({ title: 'Error', message: getFriendlyErrorMessage(error), variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const updatePersonalInfo = async (data: { fullName: string; address: string; birthday: string }) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const updated = await updateProfileApi(user.id, {
        full_name: data.fullName,
        address: data.address,
        birthday: data.birthday,
      });

      setUser(updated);
      showToast({ title: 'Success', message: 'Profile updated.', variant: 'success' });
      return true;
    } catch (error) {
      showToast({ title: 'Error', message: getFriendlyErrorMessage(error), variant: 'error' });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const updatePreferences = async (bibleVersion: any, reminderTime: string, notificationsEnabled: boolean) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const updated = await updateProfileApi(user.id, {
        bible_version: bibleVersion,
        reminder_time: reminderTime,
      });
      setUser(updated);

      if (notificationsEnabled) {
        const verse = await fetchDailyVerse();
        await cancelDailyVerseNotifications();
        await scheduleDailyVerseNotification(verse, reminderTime);
      } else {
        await cancelDailyVerseNotifications();
      }

      showToast({ title: 'Success', message: 'Preferences saved.', variant: 'success' });
      return true;
    } catch (error) {
      showToast({ title: 'Error', message: getFriendlyErrorMessage(error), variant: 'error' });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const submitVerification = async (certificate: any) => {
    if (!user?.id || !certificate) return;
    setIsSaving(true);
    try {
      const uploaded = await uploadVerificationCertificate({
        userId: user.id,
        base64: certificate.base64,
        uri: certificate.uri,
        contentType: certificate.mimeType,
        fileName: certificate.name,
      });

      const { error } = await supabase.from('verification_requests').upsert({
        user_id: user.id,
        verification_level: 'level_2',
        status: 'pending',
        certificate_bucket: uploaded.bucketId,
        certificate_path: uploaded.objectPath,
        certificate_file_name: certificate.name,
        submitted_at: new Date().toISOString(),
      } as never);

      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['verificationStatus', user.id] });
      showToast({ title: 'Sent', message: 'Verification request submitted.', variant: 'success' });
      return true;
    } catch (error) {
      showToast({ title: 'Error', message: getFriendlyErrorMessage(error), variant: 'error' });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  return {
    user,
    isSaving,
    hasPendingVerification,
    handlePickAvatar,
    updatePersonalInfo,
    updatePreferences,
    submitVerification,
    handleSignOut,
  };
}
