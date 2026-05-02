import { useCallback, useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

/**
 * Hook to track online/offline status with automatic reconnection handling
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);
  const [connectionType, setConnectionType] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable ?? false);
      setConnectionType(state.type);
    });

    // Initial fetch
    NetInfo.fetch().then((state: NetInfoState) => {
      setIsOnline(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable ?? false);
      setConnectionType(state.type);
    });

    return () => unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    const state = await NetInfo.fetch();
    setIsOnline(state.isConnected ?? false);
    setIsInternetReachable(state.isInternetReachable ?? false);
    setConnectionType(state.type);
  }, []);

  return {
    isOnline,
    isInternetReachable,
    connectionType,
    isConnected: isOnline && isInternetReachable !== false,
    refresh,
  };
};