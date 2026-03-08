import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  Unsubscribe,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { getTierForXp } from "../constants/gamification";
import { UserProfile } from "../types/social";
import { toIso } from "./firestoreUtils";

const AVATAR_COLORS = [
  "#2563EB",
  "#0EA5E9",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#14B8A6",
  "#EC4899",
];

export const DEFAULT_SCHOOL_ID = "fbla-atlas";
export const DEFAULT_SCHOOL_NAME = "FBLA Atlas";

function colorFromId(id: string): string {
  const sum = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function avatarUrlFromId(uid: string): string {
  const hash = uid.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const imageId = (hash % 70) + 1;
  return `https://i.pravatar.cc/150?img=${imageId}`;
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
    grade: "11",
    avatarColor: colorFromId(uid),
    avatarUrl: avatarUrlFromId(uid),
    bio: "Building projects, joining clubs, and leveling up.",
    xp: 0,
    tier: tier.name,
    graduationYear: graduationYearFromGrade("11"),
    streakCount: 0,
    moodEmoji: null,
    moodUpdatedAt: null,
    badges: ["First Login"],
    followerIds: [],
    followingIds: [],
    pointsByAction: {},
    lastDailyLoginDate: null,
    joinedEventIds: [],
  };
}

function parseUser(uid: string, data: Record<string, unknown>): UserProfile {
  const base = createDefaultUserProfile(uid);
  const xp = typeof data.xp === "number" ? data.xp : base.xp;
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
    grade: typeof data.grade === "string" ? data.grade : base.grade,
    avatarColor:
      typeof data.avatarColor === "string" ? data.avatarColor : base.avatarColor,
    avatarUrl:
      typeof data.avatarUrl === "string" ? data.avatarUrl : base.avatarUrl,
    bio: typeof data.bio === "string" ? data.bio : base.bio,
    xp,
    tier: getTierForXp(xp).name,
    graduationYear:
      typeof data.graduationYear === "number"
        ? data.graduationYear
        : graduationYearFromGrade(typeof data.grade === "string" ? data.grade : base.grade),
    streakCount:
      typeof data.streakCount === "number" ? data.streakCount : base.streakCount,
    moodEmoji: typeof data.moodEmoji === "string" ? data.moodEmoji : null,
    moodUpdatedAt:
      typeof data.moodUpdatedAt === "string" ? data.moodUpdatedAt : null,
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
      typeof data.lastDailyLoginDate === "string" ? data.lastDailyLoginDate : null,
    joinedEventIds: Array.isArray(data.joinedEventIds)
      ? data.joinedEventIds.filter((item): item is string => typeof item === "string")
      : [],
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
  fields: Partial<Pick<UserProfile, "displayName" | "bio" | "grade">>,
): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}
