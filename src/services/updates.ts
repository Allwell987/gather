// src/services/updates.ts
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

export interface OTAUpdateStatus {
  isChecking: boolean;
  isUpdateAvailable: boolean;
  isUpdatePending: boolean;
  error: string | null;
}

/**
 * Checks for OTA live updates and fetches if available.
 * Safe to call on app startup or manually from settings.
 *
 * @returns true if an update was downloaded and is ready to be applied via reloadAsync().
 */
export async function checkAndFetchUpdateAsync(options: { throwOnError?: boolean } = {}): Promise<boolean> {
  if (__DEV__) {
    return false;
  }

  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      return true;
    }
  } catch (error: any) {
    if (__DEV__) {
      console.warn('[Updates] Check for live updates failed:', error?.message ?? error);
    }
    if (options.throwOnError) {
      throw error;
    }
  }

  return false;
}

/**
 * Reloads the app to immediately apply the newly fetched update.
 */
export async function applyUpdateAsync(): Promise<void> {
  try {
    await Updates.reloadAsync();
  } catch (error) {
    Alert.alert('Update Error', 'Could not apply update automatically. Please close and reopen Gather.');
  }
}

/**
 * Prompt user to restart app if an update is pending.
 */
export function promptUpdateReload(): void {
  Alert.alert(
    'Update Ready',
    'A new update for Gather has been downloaded. Restart now to apply the latest changes?',
    [
      { text: 'Later', style: 'cancel' },
      { text: 'Restart Now', style: 'default', onPress: () => void applyUpdateAsync() },
    ]
  );
}
