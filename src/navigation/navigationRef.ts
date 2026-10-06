import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';

type NotificationPayload = Record<string, unknown>;

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingNotificationPayload: NotificationPayload | null = null;

const getStringValue = (value: unknown) => (typeof value === 'string' ? value : null);

const navigateFromNotificationPayload = (payload: NotificationPayload) => {
  const type = getStringValue(payload.type);

  if (!type) {
    return false;
  }

  if (type === 'prayer_request' || type === 'prayer_wall') {
    navigationRef.navigate('Main', {
      screen: 'CommunityTab',
    });
    return true;
  }

  if (type === 'event') {
    const eventId = getStringValue(payload.eventId) ?? getStringValue(payload.id);

    if (!eventId) {
      return false;
    }

    navigationRef.navigate('Main', {
      screen: 'CommunityTab',
      params: {
        screen: 'EventDetail',
        params: { eventId },
      },
    });
    return true;
  }

  return false;
};

export const queueNotificationNavigation = (payload: NotificationPayload) => {
  pendingNotificationPayload = payload;
};

export const tryHandleNotificationNavigation = (
  payload: NotificationPayload | undefined | null,
  canNavigate: boolean
) => {
  if (!payload) {
    return false;
  }

  if (!canNavigate || !navigationRef.isReady()) {
    queueNotificationNavigation(payload);
    return false;
  }

  return navigateFromNotificationPayload(payload);
};

export const flushPendingNotificationNavigation = (canNavigate: boolean) => {
  if (!pendingNotificationPayload || !canNavigate || !navigationRef.isReady()) {
    return false;
  }

  const payload = pendingNotificationPayload;
  pendingNotificationPayload = null;

  return navigateFromNotificationPayload(payload);
};
