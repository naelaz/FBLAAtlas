import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { requestPushPermissions } from "../services/pushService";

type PushNotificationsContextValue = {
  enabled: boolean;
  requested: boolean;
  requestPermissionsNow: () => Promise<boolean>;
};

const STORAGE_KEY = "fbla_atlas_push_requested_v1";

const PushNotificationsContext = createContext<PushNotificationsContextValue | undefined>(
  undefined,
);

export function PushNotificationsProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [requested, setRequested] = useState(false);

  const requestPermissionsNow = async (): Promise<boolean> => {
    try {
      const granted = await requestPushPermissions();
      setEnabled(granted);
      setRequested(true);
      await AsyncStorage.setItem(STORAGE_KEY, "1");
      return granted;
    } catch (error) {
      console.warn("Push permission request failed:", error);
      setRequested(true);
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      const previouslyRequested = await AsyncStorage.getItem(STORAGE_KEY);
      if (previouslyRequested) {
        if (mounted) {
          setRequested(true);
        }
        const granted = await requestPushPermissions();
        if (mounted) {
          setEnabled(granted);
        }
        return;
      }
      if (mounted) {
        void requestPermissionsNow();
      }
    };

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      enabled,
      requested,
      requestPermissionsNow,
    }),
    [enabled, requested],
  );

  return (
    <PushNotificationsContext.Provider value={value}>
      {children}
    </PushNotificationsContext.Provider>
  );
}

export function usePushNotifications(): PushNotificationsContextValue {
  const context = useContext(PushNotificationsContext);
  if (!context) {
    throw new Error("usePushNotifications must be used inside PushNotificationsProvider");
  }
  return context;
}

