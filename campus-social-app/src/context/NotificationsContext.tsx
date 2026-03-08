import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { AppNotification } from "../types/social";
import {
  dismissNotification,
  fetchNotificationsOnce,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeNotifications,
} from "../services/notificationService";
import { useAuthContext } from "./AuthContext";

type NotificationsContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  refreshing: boolean;
  refreshNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  dismiss: (notificationId: string) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(
  undefined,
);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { uid } = useAuthContext();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!uid) {
      return;
    }

    const unsubscribe = subscribeNotifications(
      uid,
      setNotifications,
      (error) => {
        console.warn("Notifications subscription failed:", error);
      },
    );
    return unsubscribe;
  }, [uid]);

  const refreshNotifications = async () => {
    if (!uid) {
      return;
    }

    setRefreshing(true);
    try {
      const next = await fetchNotificationsOnce(uid);
      setNotifications(next);
    } catch (error) {
      console.warn("Notifications refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const markAllRead = async () => {
    if (!uid) {
      return;
    }
    try {
      await markAllNotificationsRead(uid);
    } catch (error) {
      console.warn("Mark all read failed:", error);
    }
  };

  const markRead = async (notificationId: string) => {
    if (!uid) {
      return;
    }
    try {
      await markNotificationRead(uid, notificationId);
    } catch (error) {
      console.warn("Mark read failed:", error);
    }
  };

  const dismiss = async (notificationId: string) => {
    if (!uid) {
      return;
    }
    try {
      await dismissNotification(uid, notificationId);
    } catch (error) {
      console.warn("Dismiss notification failed:", error);
    }
  };

  const unreadCount = notifications.filter((item) => !item.read).length;

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      refreshing,
      refreshNotifications,
      markAllRead,
      markRead,
      dismiss,
    }),
    [dismiss, markAllRead, markRead, notifications, refreshNotifications, refreshing, unreadCount],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used inside NotificationsProvider");
  }
  return context;
}
