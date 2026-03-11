import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged, signInAnonymously, signOut } from "firebase/auth";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import { auth } from "../config/firebase";
import { seedSchoolDataForUser } from "../services/socialService";
import {
  createDefaultUserProfile,
  ensureUserProfile,
  getUserProfileOnce,
  subscribeUserProfile,
} from "../services/userService";
import { UserProfile } from "../types/social";

type AuthContextValue = {
  uid: string | null;
  profile: UserProfile | null;
  loading: boolean;
  isGuest: boolean;
  isAdminMode: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  exitGuestMode: () => Promise<void>;
  signOutUser: () => Promise<void>;
  setAdminMode: (enabled: boolean) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const GUEST_MODE_KEY = "fbla_atlas_guest_mode_v1";
const ADMIN_MODE_KEY = "fbla_atlas_admin_mode_v1";

function buildGuestProfile(uid: string): UserProfile {
  const base = createDefaultUserProfile(uid);
  return {
    ...base,
    displayName: "Guest Member",
    bio: "Guest mode: sign in to save progress and join your chapter.",
    authProvider: "guest",
    isGuest: true,
    schoolName: "FBLA Atlas Guest",
    schoolId: "fbla-atlas",
    chapterName: "Guest Chapter",
    state: "US",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [guestPrefReady, setGuestPrefReady] = useState(false);

  const seededRef = useRef<string | null>(null);
  const guestModeRef = useRef(false);
  const adminModeRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const bootstrapGuestPref = async () => {
      try {
        const flag = await AsyncStorage.getItem(GUEST_MODE_KEY);
        const adminFlag = await AsyncStorage.getItem(ADMIN_MODE_KEY);
        if (!mounted) {
          return;
        }
        guestModeRef.current = flag === "1";
        adminModeRef.current = adminFlag === "1";
        setIsAdminMode(adminModeRef.current);
      } catch (error) {
        console.warn("Guest mode bootstrap failed:", error);
      } finally {
        if (mounted) {
          setGuestPrefReady(true);
        }
      }
    };

    void bootstrapGuestPref();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!guestPrefReady) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          console.log("[NavAction] AuthState -> Auth screen (no user)");
          setUid(null);
          setProfile(null);
          setIsGuest(false);
          setIsAdminMode(adminModeRef.current);
          setLoading(false);
          return;
        }

        if (firebaseUser.isAnonymous) {
          console.log("[NavAction] AuthState -> Guest mode");
          if (!guestModeRef.current) {
            await signOut(auth);
            setUid(null);
            setProfile(null);
            setIsGuest(false);
            setLoading(false);
            return;
          }

          const guestProfile = buildGuestProfile(firebaseUser.uid);
          setUid(firebaseUser.uid);
          setProfile(guestProfile);
          setIsGuest(true);
          setLoading(false);
          return;
        }

        if (guestModeRef.current) {
          guestModeRef.current = false;
          await AsyncStorage.removeItem(GUEST_MODE_KEY);
        }
        setIsAdminMode(adminModeRef.current);

        setUid(firebaseUser.uid);
        setIsGuest(false);
        try {
          const ensuredProfile = await ensureUserProfile(firebaseUser.uid);
          setProfile(ensuredProfile);
          console.log("[AuthState] profile ready", {
            uid: firebaseUser.uid,
            onboardingCompleted: Boolean(ensuredProfile.onboardingCompleted),
          });
        } catch (profileError) {
          console.warn("Profile ensure failed, using local fallback profile:", profileError);
          const fallbackBase = createDefaultUserProfile(firebaseUser.uid);
          const fallbackProfile: UserProfile = {
            ...fallbackBase,
            displayName:
              firebaseUser.displayName?.trim() ||
              firebaseUser.email?.split("@")[0] ||
              fallbackBase.displayName,
            authProvider:
              firebaseUser.providerData.some((provider) => provider.providerId === "google.com")
                ? "google"
                : "email",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setProfile(fallbackProfile);
          console.log("[AuthState] fallback profile applied", {
            uid: firebaseUser.uid,
            onboardingCompleted: Boolean(fallbackProfile.onboardingCompleted),
          });
        }
        setLoading(false);
      } catch (error) {
        console.warn("Auth bootstrap failed:", error);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [guestPrefReady]);

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
    if (!profile || isGuest) {
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
  }, [profile, isGuest]);

  const refreshProfile = async () => {
    if (!uid || isGuest) {
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

  const signInAsGuest = async () => {
    try {
      guestModeRef.current = true;
      setIsGuest(true);
      await AsyncStorage.setItem(GUEST_MODE_KEY, "1");
      adminModeRef.current = false;
      setIsAdminMode(false);
      await AsyncStorage.removeItem(ADMIN_MODE_KEY).catch(() => undefined);

      const current = auth.currentUser;
      if (current && !current.isAnonymous) {
        await signOut(auth);
      }

      if (!auth.currentUser || !auth.currentUser.isAnonymous) {
        await signInAnonymously(auth);
      }

      const resolvedUid = auth.currentUser?.uid ?? `guest_${Date.now().toString(36)}`;
      setUid(resolvedUid);
      setProfile(buildGuestProfile(resolvedUid));
    } catch (error) {
      console.warn("Guest sign-in failed:", error);
      guestModeRef.current = false;
      setIsGuest(false);
      await AsyncStorage.removeItem(GUEST_MODE_KEY).catch(() => undefined);
    }
  };

  const exitGuestMode = async () => {
    guestModeRef.current = false;
    setIsGuest(false);
    await AsyncStorage.removeItem(GUEST_MODE_KEY).catch(() => undefined);
    adminModeRef.current = false;
    setIsAdminMode(false);
    await AsyncStorage.removeItem(ADMIN_MODE_KEY).catch(() => undefined);
    if (auth.currentUser?.isAnonymous) {
      await signOut(auth).catch((error) => {
        console.warn("Guest sign-out failed:", error);
      });
    }
    setUid(null);
    setProfile(null);
  };

  const signOutUser = async () => {
    guestModeRef.current = false;
    setIsGuest(false);
    await AsyncStorage.removeItem(GUEST_MODE_KEY).catch(() => undefined);
    adminModeRef.current = false;
    setIsAdminMode(false);
    await AsyncStorage.removeItem(ADMIN_MODE_KEY).catch(() => undefined);
    await signOut(auth).catch((error) => {
      console.warn("Sign out failed:", error);
    });
    setUid(null);
    setProfile(null);
  };

  const isAuthenticated = Boolean(uid && profile);

  const setAdminMode = async (enabled: boolean) => {
    adminModeRef.current = enabled;
    setIsAdminMode(enabled);
    if (enabled) {
      await AsyncStorage.setItem(ADMIN_MODE_KEY, "1");
      return;
    }
    await AsyncStorage.removeItem(ADMIN_MODE_KEY).catch(() => undefined);
  };

  const value = useMemo(
    () => ({
      uid,
      profile,
      loading,
      isGuest,
      isAdminMode,
      isAuthenticated,
      refreshProfile,
      signInAsGuest,
      exitGuestMode,
      signOutUser,
      setAdminMode,
    }),
    [uid, profile, loading, isGuest, isAdminMode, isAuthenticated],
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
