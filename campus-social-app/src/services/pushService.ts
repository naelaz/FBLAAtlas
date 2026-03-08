import { isRunningInExpoGo } from "expo";
import * as Device from "expo-device";
import { Platform } from "react-native";

type NotificationsModule = typeof import("expo-notifications");

let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;
let handlerConfigured = false;

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
    module.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    handlerConfigured = true;
  }

  return module;
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
