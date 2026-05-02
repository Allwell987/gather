import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Hook to track app state changes (background, foreground, inactive)
 */
export const useAppState = () => {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return {
    appState,
    isActive: appState === 'active',
    isBackground: appState === 'background',
    isInactive: appState === 'inactive',
  };
};

/**
 * Hook to detect when app comes to foreground
 */
export const useOnForeground = (callback: () => void, deps: unknown[] = []) => {
  const { isActive, appState } = useAppState();
  const previousState = useState(appState);

  useEffect(() => {
    if (previousState[0] === 'background' && isActive) {
      callback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, appState, ...deps]);
};

/**
 * Hook to detect when app goes to background
 */
export const useOnBackground = (callback: () => void, deps: unknown[] = []) => {
  const { isActive, appState } = useAppState();

  useEffect(() => {
    if (isActive && appState === 'active') {
      // Store previous state
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, appState, ...deps]);
};