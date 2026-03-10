import { isRunningInExpoGo } from "expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import { Platform } from "react-native";

type NotificationsModule = typeof import("expo-notifications");

let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;
let handlerConfigured = false;
let pushSuppressed = false;
const PRACTICE_REMINDER_IDS_KEY = "fbla_atlas_practice_reminder_ids_v1";

function isUnsupportedInExpoGo(): boolean {
  return Platform.OS === "android" && isRunningInExpoGo();
}

async function getNotificationsModule(): Promise<NotificationsModule | null> {
  if (isUnsupportedInExpoGo()) {
    return null;
  }

  if (!notificationsModulePromise) {
    notificationsModulePromise = import("expo-notifications")
      .then((module) => module)
      .catch((error) => {
        console.warn("Notifications module load failed:", error);
        return null;
      });
  }

  const module = await notificationsModulePromise;
  if (!module) {
    return null;
  }

  if (!handlerConfigured) {
    module.setNotificationHandler(pushSuppressed ? suppressedHandler() : defaultHandler());
    handlerConfigured = true;
  }

  return module;
}

function defaultHandler() {
  return {
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  };
}

function suppressedHandler() {
  return {
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  };
}

export async function requestPushPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    return false;
  }

  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return false;
  }

  const settings = await Notifications.getPermissionsAsync();
  if (
    settings.granted ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function sendLocalPush(title: string, body: string): Promise<void> {
  if (pushSuppressed) {
    return;
  }
  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: false,
    },
    trigger: null,
  });
}

export async function setGlobalPushSuppressed(suppressed: boolean): Promise<void> {
  pushSuppressed = suppressed;
  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return;
  }

  try {
    if (suppressed) {
      (Notifications as unknown as { setNotificationHandler: (handler: unknown) => void }).setNotificationHandler(
        null,
      );
    } else {
      Notifications.setNotificationHandler(defaultHandler());
    }
  } catch {
    Notifications.setNotificationHandler(suppressed ? suppressedHandler() : defaultHandler());
  } finally {
    handlerConfigured = true;
  }
}

async function readStoredReminderIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(PRACTICE_REMINDER_IDS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

async function writeStoredReminderIds(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PRACTICE_REMINDER_IDS_KEY, JSON.stringify(ids));
  } catch (error) {
    console.warn("Failed to persist practice reminder ids:", error);
  }
}

export async function configurePracticeReminders(enabled: boolean): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return;
  }

  const existing = await readStoredReminderIds();
  if (!enabled) {
    await Promise.all(
      existing.map(async (id) => {
        try {
          await Notifications.cancelScheduledNotificationAsync(id);
        } catch {
          // ignore stale ids
        }
      }),
    );
    await writeStoredReminderIds([]);
    return;
  }

  if (existing.length > 0) {
    return;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Practice Reminder",
      body: "Run a quick FBLA practice session today.",
      sound: false,
    },
    trigger:
      Platform.OS === "ios"
        ? ({ hour: 18, minute: 0, repeats: true } as any)
        : ({ hour: 18, minute: 0, repeats: true } as any),
  });
  await writeStoredReminderIds([id]);
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return;
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn("Failed to cancel scheduled notifications:", error);
  }
  await writeStoredReminderIds([]);
}
