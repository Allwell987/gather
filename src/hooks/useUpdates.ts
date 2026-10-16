// src/hooks/useUpdates.ts
import { useState, useCallback, useEffect } from 'react';
import { AppState, Alert } from 'react-native';
import {
  checkAndFetchUpdateAsync,
  applyUpdateAsync,
  promptUpdateReload,
} from '../services/updates';
import { useToastStore } from '../store/toastStore';

export function useUpdates() {
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdateReady, setIsUpdateReady] = useState(false);
  const showToast = useToastStore((s) => s.showToast);

  const checkAutoUpdate = useCallback(async () => {
    if (__DEV__) return;

    try {
      const updateFetched = await checkAndFetchUpdateAsync();
      if (updateFetched) {
        setIsUpdateReady(true);
        showToast({
          title: 'Gather Updated',
          message: 'A live update is ready. Restart Gather to apply it.',
          variant: 'info',
          duration: 6000,
        });
      }
    } catch {
      // Silently fail on background check
    }
  }, [showToast]);

  const checkManualUpdate = useCallback(async () => {
    if (__DEV__) {
      Alert.alert(
        'Development Mode',
        'Live OTA updates are disabled in development builds. They work automatically in release builds!'
      );
      return;
    }

    setIsChecking(true);
    try {
      const updateFetched = await checkAndFetchUpdateAsync({ throwOnError: true });
      if (updateFetched) {
        setIsUpdateReady(true);
        promptUpdateReload();
      } else {
        showToast({
          title: 'Up to Date',
          message: 'Gather is running the latest live version.',
          variant: 'success',
        });
      }
    } catch (err: any) {
      Alert.alert('Update Check Failed', err?.message ?? 'Could not check for updates at this time.');
    } finally {
      setIsChecking(false);
    }
  }, [showToast]);

  // Check on initial app launch and foregrounding
  useEffect(() => {
    void checkAutoUpdate();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void checkAutoUpdate();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkAutoUpdate]);

  return {
    isChecking,
    isUpdateReady,
    checkManualUpdate,
    applyUpdate: applyUpdateAsync,
  };
}
