import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
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
import { DAILY_VERSE } from '../../../constants/theme';
import { getFriendlyErrorMessage } from '../../../services/errorMapping';

export function useProfile() {
  const { user, setUser, signOut } = useAuthStore();
  const { showToast } = useToastStore();
  const [isSaving, setIsSaving] = useState(false);
  const [hasPendingVerification, setHasPendingVerification] = useState(false);

  const checkVerificationStatus = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('verification_requests')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();
    setHasPendingVerification((data as any)?.status === 'pending');
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) checkVerificationStatus();
  }, [user?.id, checkVerificationStatus]);

  const updatePersonalInfo = async (data: { fullName: string; address: string; birthday: string; avatar?: any }) => {
    if (!user) return;
    setIsSaving(true);
    try {
      let avatarUrl = user.avatar_url;
      if (data.avatar) {
        avatarUrl = await uploadProfileAvatar({
          userId: user.id,
          base64: data.avatar.base64,
          uri: data.avatar.uri,
          contentType: data.avatar.mimeType,
        });
      }

      const updated = await updateProfileApi(user.id, {
        full_name: data.fullName,
        address: data.address,
        birthday: data.birthday,
        avatar_url: avatarUrl,
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
        await cancelDailyVerseNotifications();
        await scheduleDailyVerseNotification(DAILY_VERSE, reminderTime);
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
      setHasPendingVerification(true);
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
    updatePersonalInfo,
    updatePreferences,
    submitVerification,
    handleSignOut,
  };
}
