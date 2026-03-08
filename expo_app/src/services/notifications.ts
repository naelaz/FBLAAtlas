import Constants from 'expo-constants';
import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

let handlerConfigured = false;

function isExpoGo(): boolean {
  const anyConstants = Constants as unknown as {
    appOwnership?: string;
    executionEnvironment?: string;
  };
  return (
    anyConstants.appOwnership === 'expo' ||
    anyConstants.executionEnvironment === 'storeClient'
  );
}

async function getNotificationsModule(): Promise<NotificationsModule | null> {
  if (isExpoGo()) {
    return null;
  }
  return import('expo-notifications');
}

async function ensureHandler(module: NotificationsModule): Promise<void> {
  if (handlerConfigured) {
    return;
  }
  module.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  handlerConfigured = true;
}

export async function setupNotifications(): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return;
  }

  await ensureHandler(Notifications);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('event-reminders', {
      name: 'Event Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E96A1C',
    });
  }

  const settings = await Notifications.getPermissionsAsync();
  if (
    settings.granted ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return;
  }
  await Notifications.requestPermissionsAsync();
}

export async function scheduleReminderNotification(args: {
  title: string;
  body: string;
  at: Date;
}): Promise<string> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    // Expo Go fallback: keep reminder data without scheduling a native notification.
    return `expo-go-fallback-${Date.now()}`;
  }

  await ensureHandler(Notifications);

  const now = Date.now();
  const triggerDate = args.at.getTime() < now ? new Date(now + 5000) : args.at;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: args.title,
      body: args.body,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: 'event-reminders',
    },
  });
}

export async function cancelReminderNotification(
  notificationId: string,
): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return;
  }
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function sendTestNotification(): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return;
  }

  await ensureHandler(Notifications);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'FBLA Atlas Test',
      body: 'Notifications are working on this device.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
    },
  });
}
