import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import { auth } from "../config/firebase";
import { UserProfile } from "../types/social";
import { seedSchoolDataForUser } from "../services/socialService";
import {
  ensureUserProfile,
  getUserProfileOnce,
  subscribeUserProfile,
} from "../services/userService";

type AuthContextValue = {
  uid: string | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const seededRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUid(null);
          setProfile(null);
          await signInAnonymously(auth);
          return;
        }

        setUid(firebaseUser.uid);
        await ensureUserProfile(firebaseUser.uid);
        setLoading(false);
      } catch (error) {
        console.warn("Auth bootstrap failed:", error);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!uid) {
      return;
    }

    const unsubscribe = subscribeUserProfile(
      uid,
      (nextProfile) => {
        setProfile(nextProfile);
      },
      (error) => {
        console.warn("Profile subscription failed:", error);
      },
    );

    return unsubscribe;
  }, [uid]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const seedKey = `${profile.schoolId}:${profile.uid}`;
    if (seededRef.current === seedKey) {
      return;
    }

    seededRef.current = seedKey;
    void seedSchoolDataForUser(profile).catch((error) => {
      console.warn("Seed data failed:", error);
    });
  }, [profile]);

  const refreshProfile = async () => {
    if (!uid) {
      return;
    }
    try {
      const fresh = await getUserProfileOnce(uid);
      if (fresh) {
        setProfile(fresh);
      }
    } catch (error) {
      console.warn("Profile refresh failed:", error);
    }
  };

  const value = useMemo(
    () => ({
      uid,
      profile,
      loading,
      refreshProfile,
    }),
    [uid, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used inside AuthProvider");
  }
  return context;
}
