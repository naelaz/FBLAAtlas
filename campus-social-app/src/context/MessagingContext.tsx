import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

import {
  fetchConversationsForUser,
  getTotalUnreadCount,
  subscribeConversationsForUser,
} from "../services/messagingService";
import { sendLocalPush } from "../services/pushService";
import { ConversationItem } from "../types/social";
import { useAuthContext } from "./AuthContext";
import { usePushNotifications } from "./PushNotificationsContext";
import { useSettings } from "./SettingsContext";

type MessagingContextValue = {
  conversations: ConversationItem[];
  unreadCount: number;
  refreshing: boolean;
  refreshConversations: () => Promise<void>;
};

const MessagingContext = createContext<MessagingContextValue | undefined>(undefined);

export function MessagingProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuthContext();
  const { enabled: pushEnabled } = usePushNotifications();
  const { settings } = useSettings();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const previousUnread = useRef(0);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      appState.current = nextState;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const unsubscribe = subscribeConversationsForUser(
      profile.uid,
      profile.schoolId,
      (items) => {
        setConversations(items);
        const unread = getTotalUnreadCount(items, profile.uid);
        if (
          appState.current !== "active" &&
          unread > previousUnread.current &&
          pushEnabled &&
          settings.notifications.globalPush
        ) {
          void sendLocalPush("New Message", "📩 You received a new message in FBLA Atlas.");
        }
        previousUnread.current = unread;
      },
      (error) => {
        console.warn("Messaging subscription failed:", error);
      },
    );

    return unsubscribe;
  }, [profile?.uid, profile?.schoolId, pushEnabled, settings.notifications.globalPush]);

  const refreshConversations = async () => {
    if (!profile) {
      return;
    }
    setRefreshing(true);
    try {
      const next = await fetchConversationsForUser(profile.uid, profile.schoolId);
      setConversations(next);
      previousUnread.current = getTotalUnreadCount(next, profile.uid);
    } catch (error) {
      console.warn("Conversations refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const unreadCount = profile ? getTotalUnreadCount(conversations, profile.uid) : 0;

  const value = useMemo(
    () => ({
      conversations,
      unreadCount,
      refreshing,
      refreshConversations,
    }),
    [conversations, unreadCount, refreshing],
  );

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

export function useMessaging(): MessagingContextValue {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error("useMessaging must be used within MessagingProvider");
  }
  return context;
}


