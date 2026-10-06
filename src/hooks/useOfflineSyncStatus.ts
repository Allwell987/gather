import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import {
  flushOfflineActions,
  getLastOfflineSyncAt,
  getOfflineActionSummary,
  getQueuedOfflineActionsForUser,
  type OfflineActionSummary,
} from '../services/offlineActionQueue';

const EMPTY_SYNC_SUMMARY: OfflineActionSummary = {
  total: 0,
  prayerCount: 0,
  rsvpCount: 0,
};

export const useOfflineSyncStatus = (userId?: string | null) => {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [syncSummary, setSyncSummary] = useState<OfflineActionSummary>(EMPTY_SYNC_SUMMARY);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [isRetryingSync, setIsRetryingSync] = useState(false);

  const refreshSyncStatus = useCallback(async () => {
    if (!userId) {
      setSyncSummary(EMPTY_SYNC_SUMMARY);
      setLastSyncAt(null);
      setIsOnline(null);
      return;
    }

    try {
      const [queuedActions, storedLastSyncAt, networkState] = await Promise.all([
        getQueuedOfflineActionsForUser(userId),
        getLastOfflineSyncAt(userId),
        NetInfo.fetch(),
      ]);

      setSyncSummary(getOfflineActionSummary(queuedActions));
      setLastSyncAt(storedLastSyncAt);
      setIsOnline(
        networkState.isConnected !== false && networkState.isInternetReachable !== false
      );
    } catch (error) {
      if (__DEV__) {
        console.error('Sync status refresh error:', error);
      }
    }
  }, [userId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void refreshSyncStatus();
    }, 0);
    return () => clearTimeout(timeout);
  }, [refreshSyncStatus]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshSyncStatus();
      }
    });

    const networkSubscription = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected !== false && state.isInternetReachable !== false);

      if (state.isConnected && state.isInternetReachable !== false) {
        void refreshSyncStatus();
      }
    });

    return () => {
      appStateSubscription.remove();
      networkSubscription();
    };
  }, [refreshSyncStatus, userId]);

  const retrySync = useCallback(async () => {
    if (!userId) {
      return {
        processedCount: 0,
        remainingCount: 0,
      };
    }

    try {
      setIsRetryingSync(true);

      const result = await flushOfflineActions({ userId });

      if (result.processedCount > 0) {
        await queryClient.invalidateQueries();
      }

      await refreshSyncStatus();
      return result;
    } finally {
      setIsRetryingSync(false);
    }
  }, [queryClient, refreshSyncStatus, userId]);

  return {
    isOnline,
    syncSummary,
    lastSyncAt,
    isRetryingSync,
    refreshSyncStatus,
    retrySync,
  };
};
