import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  Unsubscribe,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { db, storage } from "../config/firebase";
import { getUserAvatarFallbackUrl, getUserAvatarUrl } from "../constants/media";
import { getTierForXp } from "../constants/gamification";
import { AVATAR_FALLBACK_COLORS } from "../constants/themes";
import { UserProfile } from "../types/social";
import { toIso } from "./firestoreUtils";

export const DEFAULT_SCHOOL_ID = "fbla-atlas";
export const DEFAULT_SCHOOL_NAME = "FBLA Atlas";

function colorFromId(id: string): string {
  const sum = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_FALLBACK_COLORS[sum % AVATAR_FALLBACK_COLORS.length];
}

function avatarUrlFromId(uid: string): string {
  const generated = getUserAvatarUrl(uid);
  return generated || getUserAvatarFallbackUrl(uid);
}

function normalizeAvatarUrl(preferred: unknown, seed: string): string {
  if (typeof preferred !== "string" || preferred.trim().length === 0) {
    return getUserAvatarFallbackUrl(seed);
  }
  const trimmed = preferred.trim();
  const legacyDiceBear = /api\.dicebear\.com\/7\.x\/(avataaars|lorelei)\//i.test(trimmed);
  if (legacyDiceBear) {
    return getUserAvatarFallbackUrl(seed);
  }
  return trimmed;
}

function graduationYearFromGrade(grade: string): number {
  const numericGrade = Number(grade);
  if (!Number.isFinite(numericGrade)) {
    return new Date().getFullYear() + 1;
  }
  const yearsUntilGrad = Math.max(0, 12 - numericGrade);
  return new Date().getFullYear() + yearsUntilGrad;
}

export function createDefaultUserProfile(uid: string): Omit<UserProfile, "createdAt" | "updatedAt"> {
  const tier = getTierForXp(0);
  return {
    uid,
    displayName: `Student ${uid.slice(0, 4).toUpperCase()}`,
    schoolId: DEFAULT_SCHOOL_ID,
    schoolName: DEFAULT_SCHOOL_NAME,
    chapterId: "",
    state: "CA",
    chapterName: "FBLA Atlas Chapter",
    membershipId: null,
    onboardingCompleted: false,
    authProvider: "email",
    isGuest: false,
    grade: "11",
    avatarColor: colorFromId(uid),
    avatarUrl: avatarUrlFromId(uid),
    bio: "Building projects, joining clubs, and leveling up.",
    xp: 0,
    tier: tier.name,
    graduationYear: graduationYearFromGrade("11"),
    streakCount: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastLoginDate: null,
    moodEmoji: null,
    moodUpdatedAt: null,
    profileVisibility: "school",
    showOnlineStatus: true,
    showMood: true,
    allowFriendSuggestions: true,
    badges: ["First Login"],
    followerIds: [],
    followingIds: [],
    pointsByAction: {},
    lastDailyLoginDate: null,
    joinedEventIds: [],
    officerPosition: "Member",
    chapterRoles: [],
    yearsServed: "",
    schoolCity: "",
    competitiveEvents: [],
    placements: [],
    roleExperiences: [],
    role: "member",
    banned: false,
  };
}

function parseUser(uid: string, data: Record<string, unknown>): UserProfile {
  const base = createDefaultUserProfile(uid);
  const xp = typeof data.xp === "number" ? data.xp : base.xp;
  const currentStreak =
    typeof data.currentStreak === "number"
      ? data.currentStreak
      : typeof data.streakCount === "number"
        ? data.streakCount
        : base.currentStreak;
  const lastLoginDate =
    typeof data.lastLoginDate === "string"
      ? data.lastLoginDate
      : typeof data.lastDailyLoginDate === "string"
        ? data.lastDailyLoginDate
        : null;
  return {
    uid,
    displayName:
      typeof data.displayName === "string" && data.displayName.length > 0
        ? data.displayName
        : base.displayName,
    schoolId:
      typeof data.schoolId === "string" && data.schoolId.length > 0
        ? data.schoolId
        : base.schoolId,
    schoolName:
      typeof data.schoolName === "string" && data.schoolName.length > 0
        ? data.schoolName
        : base.schoolName,
    chapterId: typeof data.chapterId === "string" ? data.chapterId : "",
    state: typeof data.state === "string" ? data.state : base.state,
    chapterName: typeof data.chapterName === "string" ? data.chapterName : base.chapterName,
    membershipId: typeof data.membershipId === "string" ? data.membershipId : null,
    onboardingCompleted: typeof data.onboardingCompleted === "boolean" ? data.onboardingCompleted : true,
    authProvider:
      data.authProvider === "email" ||
      data.authProvider === "google" ||
      data.authProvider === "fbla_connect" ||
      data.authProvider === "guest"
        ? data.authProvider
        : base.authProvider,
    isGuest: typeof data.isGuest === "boolean" ? data.isGuest : false,
    grade: typeof data.grade === "string" ? data.grade : base.grade,
    avatarColor:
      typeof data.avatarColor === "string" ? data.avatarColor : base.avatarColor,
    avatarUrl: normalizeAvatarUrl(
      data.avatarUrl,
      typeof data.displayName === "string" && data.displayName.length > 0 ? data.displayName : uid,
    ),
    bio: typeof data.bio === "string" ? data.bio : base.bio,
    xp,
    tier: getTierForXp(xp).name,
    graduationYear:
      typeof data.graduationYear === "number"
        ? data.graduationYear
        : graduationYearFromGrade(typeof data.grade === "string" ? data.grade : base.grade),
    streakCount: currentStreak,
    currentStreak,
    longestStreak:
      typeof data.longestStreak === "number" ? data.longestStreak : Math.max(currentStreak, base.longestStreak),
    lastLoginDate,
    moodEmoji: typeof data.moodEmoji === "string" ? data.moodEmoji : null,
    moodUpdatedAt:
      typeof data.moodUpdatedAt === "string" ? data.moodUpdatedAt : null,
    profileVisibility:
      data.profileVisibility === "public" ||
      data.profileVisibility === "private" ||
      data.profileVisibility === "school"
        ? data.profileVisibility
        : "school",
    showOnlineStatus:
      typeof data.showOnlineStatus === "boolean" ? data.showOnlineStatus : true,
    showMood: typeof data.showMood === "boolean" ? data.showMood : true,
    allowFriendSuggestions:
      typeof data.allowFriendSuggestions === "boolean"
        ? data.allowFriendSuggestions
        : true,
    badges: Array.isArray(data.badges)
      ? data.badges.filter((item): item is string => typeof item === "string")
      : base.badges,
    followerIds: Array.isArray(data.followerIds)
      ? data.followerIds.filter((item): item is string => typeof item === "string")
      : [],
    followingIds: Array.isArray(data.followingIds)
      ? data.followingIds.filter((item): item is string => typeof item === "string")
      : [],
    pointsByAction:
      typeof data.pointsByAction === "object" && data.pointsByAction !== null
        ? (data.pointsByAction as UserProfile["pointsByAction"])
        : {},
    lastDailyLoginDate:
      typeof data.lastDailyLoginDate === "string" ? data.lastDailyLoginDate : lastLoginDate,
    joinedEventIds: Array.isArray(data.joinedEventIds)
      ? data.joinedEventIds.filter((item): item is string => typeof item === "string")
      : [],
    officerPosition:
      data.officerPosition === "President" ||
      data.officerPosition === "Vice President" ||
      data.officerPosition === "Secretary" ||
      data.officerPosition === "Treasurer" ||
      data.officerPosition === "Reporter" ||
      data.officerPosition === "Parliamentarian" ||
      data.officerPosition === "Historian" ||
      data.officerPosition === "Member"
        ? data.officerPosition
        : "Member",
    chapterRoles: Array.isArray(data.chapterRoles)
      ? data.chapterRoles.filter(
          (
            item,
          ): item is "Chapter Officer" | "Regional Officer" | "State Officer" | "National Officer" | "Alumni" =>
            item === "Chapter Officer" ||
            item === "Regional Officer" ||
            item === "State Officer" ||
            item === "National Officer" ||
            item === "Alumni",
        )
      : [],
    yearsServed: typeof data.yearsServed === "string" ? data.yearsServed : "",
    schoolCity: typeof data.schoolCity === "string" ? data.schoolCity : "",
    competitiveEvents: Array.isArray(data.competitiveEvents)
      ? data.competitiveEvents.filter((item): item is string => typeof item === "string")
      : [],
    placements: Array.isArray(data.placements)
      ? data.placements
          .map((entry) => {
            if (!entry || typeof entry !== "object") {
              return null;
            }
            const record = entry as Record<string, unknown>;
            const eventName = typeof record.eventName === "string" ? record.eventName : "";
            const place = record.place;
            const competitionLevel = record.competitionLevel;
            const rawYear = record.year;
            const year = typeof rawYear === "number" ? rawYear : Number(rawYear);
            if (
              !eventName ||
              !(
                place === "1st" ||
                place === "2nd" ||
                place === "3rd" ||
                place === "Top 10" ||
                place === "Top 20" ||
                place === "Qualified" ||
                place === "Participant"
              ) ||
              !(competitionLevel === "DLC" || competitionLevel === "SLC" || competitionLevel === "NLC") ||
              !Number.isFinite(year)
            ) {
              return null;
            }
            return {
              id:
                typeof record.id === "string" && record.id.trim().length > 0
                  ? record.id
                  : `${eventName}-${competitionLevel}-${year}`,
              eventName,
              place,
              competitionLevel,
              year,
            };
          })
          .filter(
            (
              item,
            ): item is {
              id: string;
              eventName: string;
              place: "1st" | "2nd" | "3rd" | "Top 10" | "Top 20" | "Qualified" | "Participant";
              competitionLevel: "DLC" | "SLC" | "NLC";
              year: number;
            } => Boolean(item),
          )
      : [],
    roleExperiences: Array.isArray(data.roleExperiences)
      ? data.roleExperiences.filter((item): item is string => typeof item === "string")
      : [],
    role: data.role === "admin" ? "admin" : "member",
    banned: typeof data.banned === "boolean" ? data.banned : false,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

export async function ensureUserProfile(uid: string): Promise<UserProfile> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const base = createDefaultUserProfile(uid);
    await setDoc(ref, {
      ...base,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return {
      ...base,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const data = snap.data() as Record<string, unknown>;
  return parseUser(uid, data);
}

export function subscribeUserProfile(
  uid: string,
  onChange: (profile: UserProfile) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const ref = doc(db, "users", uid);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        return;
      }
      onChange(parseUser(uid, snap.data() as Record<string, unknown>));
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn("Profile subscription failed:", error);
      }
    },
  );
}

export async function getUserProfileOnce(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return null;
  }
  return parseUser(uid, snap.data() as Record<string, unknown>);
}

export async function fetchAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((docSnap) =>
    parseUser(docSnap.id, docSnap.data() as Record<string, unknown>),
  );
}

export async function updateUserProfileFields(
  uid: string,
  fields: Partial<UserProfile>,
): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

export async function setUserOnboardingCompleted(uid: string, completed: boolean): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    onboardingCompleted: completed,
    updatedAt: serverTimestamp(),
  });
}



function extensionFromUri(uri: string): string {
  const match = uri.toLowerCase().match(/\.(jpg|jpeg|png|webp|heic|heif)(\?|$)/);
  return match?.[1] ?? "jpg";
}

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error("Unable to read selected image.");
  }
  return await response.blob();
}

export async function uploadProfileAvatar(uid: string, localUri: string): Promise<string> {
  const ext = extensionFromUri(localUri);
  const path = `avatars/${uid}/${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);
  const blob = await uriToBlob(localUri);
  await uploadBytes(storageRef, blob, {
    contentType: blob.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
  });
  const downloadURL = await getDownloadURL(storageRef);
  await updateDoc(doc(db, "users", uid), {
    avatarUrl: downloadURL,
    updatedAt: serverTimestamp(),
  });
  return downloadURL;
}

export async function clearProfileAvatar(uid: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    avatarUrl: "",
    updatedAt: serverTimestamp(),
  });
}

export async function deleteUserProfile(uid: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid));
}


