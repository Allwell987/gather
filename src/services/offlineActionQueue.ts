import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';

const OFFLINE_ACTION_QUEUE_KEY = 'offline-action-queue';
const OFFLINE_ACTION_LAST_SYNC_KEY = 'offline-action-last-sync';

interface OfflineActionBase<TType extends string, TPayload> {
  id: string;
  type: TType;
  createdAt: string;
  payload: TPayload;
}

export type CreatePrayerOfflineAction = OfflineActionBase<'create_prayer', {
  userId: string;
  fullName: string;
  category: string;
  text: string;
  isAnonymous: boolean;
}>;

export type ToggleRsvpOfflineAction = OfflineActionBase<'toggle_rsvp', {
  eventId: string;
  userId: string;
  shouldRsvp: boolean;
}>;

export type OfflineAction =
  | CreatePrayerOfflineAction
  | ToggleRsvpOfflineAction;

type NewOfflineAction = Omit<OfflineAction, 'id' | 'createdAt'>;

export interface FlushOfflineActionsResult {
  processedCount: number;
  remainingCount: number;
}

export interface OfflineActionSummary {
  total: number;
  prayerCount: number;
  rsvpCount: number;
}

let activeFlushPromise: Promise<FlushOfflineActionsResult> | null = null;
let writeLock: Promise<void> = Promise.resolve();

const isNetworkAvailable = async () => {
  const state = await NetInfo.fetch();

  if (state.isConnected === false) {
    return false;
  }

  if (state.isInternetReachable === false) {
    return false;
  }

  return true;
};

const createOfflineActionId = () => {
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const getLastSyncKey = (userId: string) => `${OFFLINE_ACTION_LAST_SYNC_KEY}:${userId}`;

const readOfflineActionQueue = async (): Promise<OfflineAction[]> => {
  try {
    const rawValue = await AsyncStorage.getItem(OFFLINE_ACTION_QUEUE_KEY);

    if (!rawValue) {
      return [];
    }

    return JSON.parse(rawValue) as OfflineAction[];
  } catch (error) {
    if (__DEV__) {
      console.error('Failed to read offline action queue:', error);
    }
    return [];
  }
};

const writeOfflineActionQueue = async (actions: OfflineAction[]) => {
  // Simple lock mechanism to prevent race conditions during rapid writes
  await writeLock;
  const resolveLock = (async () => {
    try {
      await AsyncStorage.setItem(OFFLINE_ACTION_QUEUE_KEY, JSON.stringify(actions));
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to write offline action queue:', error);
      }
    }
  })();
  writeLock = resolveLock;
  return resolveLock;
};

const readLastOfflineSyncAt = async (userId: string) => {
  try {
    return await AsyncStorage.getItem(getLastSyncKey(userId));
  } catch (error) {
    if (__DEV__) {
      console.error('Failed to read offline sync timestamp:', error);
    }
    return null;
  }
};

const writeLastOfflineSyncAt = async (userId: string) => {
  try {
    await AsyncStorage.setItem(getLastSyncKey(userId), new Date().toISOString());
  } catch (error) {
    if (__DEV__) {
      console.error('Failed to write offline sync timestamp:', error);
    }
  }
};

const isNetworkErrorMessage = (value?: string) => {
  const normalized = value?.toLowerCase() ?? '';

  return (
    normalized.includes('network request failed')
    || normalized.includes('failed to fetch')
    || normalized.includes('network error')
    || normalized.includes('connection')
    || normalized.includes('timed out')
    || normalized.includes('timeout')
  );
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return '';
};

const performOfflineAction = async (action: OfflineAction) => {
  switch (action.type) {
    case 'create_prayer': {
      const { error } = await supabase
        .from('prayer_requests')
        .insert({
          user_id: action.payload.userId,
          category: action.payload.category as any,
          title: action.payload.text.slice(0, 80),
          description: action.payload.text,
          is_anonymous: action.payload.isAnonymous,
          prayer_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'open',
        } as never);

      if (error) {
        throw error;
      }

      return;
    }

    case 'toggle_rsvp': {
      if (action.payload.shouldRsvp) {
        const { error } = await supabase
          .from('event_rsvps')
          .upsert(
            {
              event_id: action.payload.eventId,
              user_id: action.payload.userId,
            } as never
          );

        if (error) {
          throw error;
        }

        return;
      }

      const { error } = await supabase
        .from('event_rsvps')
        .delete()
        .eq('event_id', action.payload.eventId)
        .eq('user_id', action.payload.userId);

      if (error) {
        throw error;
      }
    }
  }
};

export const getQueuedOfflineActions = async () => {
  return readOfflineActionQueue();
};

export const getQueuedOfflineActionsForUser = async (userId: string) => {
  const queue = await readOfflineActionQueue();
  return queue.filter((action) => action.payload.userId === userId);
};

export const getOfflineActionSummary = (actions: OfflineAction[]): OfflineActionSummary => {
  return actions.reduce<OfflineActionSummary>((summary, action) => {
    switch (action.type) {
      case 'create_prayer':
        return {
          ...summary,
          total: summary.total + 1,
          prayerCount: summary.prayerCount + 1,
        };
      case 'toggle_rsvp':
        return {
          ...summary,
          total: summary.total + 1,
          rsvpCount: summary.rsvpCount + 1,
        };
      default:
        return summary;
    }
  }, {
    total: 0,
    prayerCount: 0,
    rsvpCount: 0,
  });
};

export const getLastOfflineSyncAt = async (userId: string) => {
  return readLastOfflineSyncAt(userId);
};

export const enqueueOfflineAction = async (action: NewOfflineAction): Promise<OfflineAction> => {
  const queue = await readOfflineActionQueue();
  const queuedAction: OfflineAction = {
    ...action,
    id: createOfflineActionId(),
    createdAt: new Date().toISOString(),
  } as OfflineAction;

  await writeOfflineActionQueue([...queue, queuedAction]);
  return queuedAction;
};

export const shouldQueueOfflineAction = async (error?: unknown) => {
  const online = await isNetworkAvailable();

  if (!online) {
    return true;
  }

  return isNetworkErrorMessage(getErrorMessage(error));
};

export const flushOfflineActions = async (
  options?: { userId?: string }
): Promise<FlushOfflineActionsResult> => {
  if (activeFlushPromise) {
    return activeFlushPromise;
  }

  activeFlushPromise = (async () => {
    const queue = await readOfflineActionQueue();
    const targetQueue = options?.userId
      ? queue.filter((action) => action.payload.userId === options.userId)
      : queue;
    const untouchedQueue = options?.userId
      ? queue.filter((action) => action.payload.userId !== options.userId)
      : [];

    if (targetQueue.length === 0) {
      return {
        processedCount: 0,
        remainingCount: 0,
      };
    }

    const online = await isNetworkAvailable();

    if (!online) {
      return {
        processedCount: 0,
        remainingCount: targetQueue.length,
      };
    }

    const remaining: OfflineAction[] = [];
    let processedCount = 0;

    for (const [index, action] of targetQueue.entries()) {
      try {
        await performOfflineAction(action);
        processedCount += 1;
      } catch (error) {
        if (__DEV__) {
          console.error(`Failed to flush offline action ${action.id}:`, error);
        }
        remaining.push(action);

        if (isNetworkErrorMessage(getErrorMessage(error))) {
          remaining.push(...targetQueue.slice(index + 1));
          break;
        }
      }
    }

    await writeOfflineActionQueue([...untouchedQueue, ...remaining]);

    if (processedCount > 0 && options?.userId) {
      await writeLastOfflineSyncAt(options.userId);
    }

    return {
      processedCount,
      remainingCount: remaining.length,
    };
  })();

  try {
    return await activeFlushPromise;
  } finally {
    activeFlushPromise = null;
  }
};
