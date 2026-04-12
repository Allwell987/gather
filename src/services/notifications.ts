// src/services/notifications.ts
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BROADCAST_NOTIFICATIONS_ERROR =
  'Broadcast push notifications must be sent from a trusted server or Supabase Edge Function.';
const DEFAULT_DAILY_VERSE_TIME = '07:00';

const getConfiguredProjectId = (): string | null => {
  const projectId =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;

  if (typeof projectId !== 'string') {
    return null;
  }

  const normalizedProjectId = projectId.trim();
  return UUID_REGEX.test(normalizedProjectId) ? normalizedProjectId : null;
};

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Request permissions and get push token
export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  try {
    const projectId = getConfiguredProjectId();

    if (!projectId) {
      console.warn(
        'Skipping Expo push token registration because no valid EAS project ID is configured.'
      );
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
};

// Save push token to user profile
export const savePushToken = async (userId: string, token: string) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token } as never)
      .eq('id', userId);

    if (error) {
      console.error('Error saving push token:', error);
    } else {
      console.log('Push token saved successfully');
    }
  } catch (error) {
    console.error('Error saving push token:', error);
  }
};

// Broadcast fan-out should happen from a trusted backend so clients never enumerate push tokens.
export const sendNotificationToAll = async (title: string, body: string, data?: any) => {
  console.warn(BROADCAST_NOTIFICATIONS_ERROR, {
    title,
    body,
    hasData: Boolean(data),
  });
  return { queued: false, error: BROADCAST_NOTIFICATIONS_ERROR };
};

// Schedule local notification (for reminders)
export const scheduleNotification = async (
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput,
  data?: Record<string, unknown>
) => {
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data,
      },
      trigger,
    });
    return identifier;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

// Schedule daily verse notification at 7:00 AM
export const scheduleDailyVerseNotification = async (
  verse: { text: string; reference: string },
  reminderTime = DEFAULT_DAILY_VERSE_TIME
): Promise<string | null> => {
  const [hourString, minuteString] = reminderTime.split(':');
  const parsedHour = Number(hourString);
  const parsedMinute = Number(minuteString);
  const hour = Number.isInteger(parsedHour) && parsedHour >= 0 && parsedHour <= 23
    ? parsedHour
    : 7;
  const minute = Number.isInteger(parsedMinute) && parsedMinute >= 0 && parsedMinute <= 59
    ? parsedMinute
    : 0;
  const trigger: Notifications.DailyTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
  };

  return scheduleNotification(
    '📖 Daily Verse',
    `"${verse.text}"\n— ${verse.reference}`,
    trigger,
    { type: 'bible_verse' }
  );
};

// Cancel all scheduled daily verse notifications
export const cancelDailyVerseNotifications = async () => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const dailyVerseNotifications = scheduled.filter(
      (n) => n.content.title === '📖 Daily Verse'
    );
    
    for (const notification of dailyVerseNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  } catch (error) {
    console.error('Error canceling daily verse notifications:', error);
  }
};
