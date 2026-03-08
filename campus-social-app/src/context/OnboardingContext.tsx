import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type OnboardingContextValue = {
  completed: boolean;
  ready: boolean;
  completeOnboarding: () => Promise<void>;
};

const STORAGE_KEY = "fbla_atlas_onboarding_complete_v1";

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [completed, setCompleted] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (mounted) {
          setCompleted(saved === "1");
        }
      } catch (error) {
        console.warn("Onboarding state load failed:", error);
      } finally {
        if (mounted) {
          setReady(true);
        }
      }
    };

    void bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  const completeOnboarding = async () => {
    setCompleted(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, "1");
    } catch (error) {
      console.warn("Onboarding state save failed:", error);
    }
  };

  const value = useMemo(
    () => ({
      completed,
      ready,
      completeOnboarding,
    }),
    [completed, ready],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used inside OnboardingProvider");
  }
  return context;
}

