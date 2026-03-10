import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  where,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { RoommateMatch, RoommatePreference } from "../types/features";
import { toIso } from "./firestoreUtils";

function parsePreference(uid: string, data: Record<string, unknown>): RoommatePreference {
  return {
    uid,
    chapterId: typeof data.chapterId === "string" ? data.chapterId : "",
    conferenceLevel: data.conferenceLevel === "SLC" || data.conferenceLevel === "NLC" ? data.conferenceLevel : "DLC",
    sleepSchedule: typeof data.sleepSchedule === "string" ? data.sleepSchedule : "",
    noiseLevel: typeof data.noiseLevel === "string" ? data.noiseLevel : "",
    tidiness: typeof data.tidiness === "string" ? data.tidiness : "",
    studyPreference: typeof data.studyPreference === "string" ? data.studyPreference : "",
    genderPreference: typeof data.genderPreference === "string" ? data.genderPreference : "",
    note: typeof data.note === "string" ? data.note : "",
    createdAt: toIso(data.createdAt),
  };
}

function parseMatch(id: string, data: Record<string, unknown>): RoommateMatch {
  return {
    id,
    conferenceLevel: data.conferenceLevel === "SLC" || data.conferenceLevel === "NLC" ? data.conferenceLevel : "DLC",
    uidA: typeof data.uidA === "string" ? data.uidA : "",
    uidB: typeof data.uidB === "string" ? data.uidB : "",
    createdAt: toIso(data.createdAt),
  };
}

export async function saveRoommatePreference(preference: RoommatePreference): Promise<void> {
  await setDoc(
    doc(db, "roommatePreferences", preference.uid),
    {
      ...preference,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function subscribeRoommateProfiles(
  chapterId: string,
  conferenceLevel: RoommatePreference["conferenceLevel"],
  onChange: (rows: RoommatePreference[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, "roommatePreferences"),
    where("chapterId", "==", chapterId),
    where("conferenceLevel", "==", conferenceLevel),
    orderBy("updatedAt", "desc"),
    limit(80),
  );
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((row) => parsePreference(row.id, row.data() as Record<string, unknown>)));
  });
}

export async function createRoommateMatch(
  conferenceLevel: RoommatePreference["conferenceLevel"],
  uidA: string,
  uidB: string,
): Promise<string> {
  const [left, right] = [uidA, uidB].sort();
  const matchId = `${conferenceLevel}_${left}_${right}`;
  await setDoc(
    doc(db, "roommateMatches", matchId),
    {
      conferenceLevel,
      uidA: left,
      uidB: right,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
  return matchId;
}

export async function fetchRoommateMatchForUser(
  uid: string,
  conferenceLevel: RoommatePreference["conferenceLevel"],
): Promise<RoommateMatch | null> {
  const left = await getDocs(
    query(
      collection(db, "roommateMatches"),
      where("conferenceLevel", "==", conferenceLevel),
      where("uidA", "==", uid),
      limit(1),
    ),
  );
  const right = await getDocs(
    query(
      collection(db, "roommateMatches"),
      where("conferenceLevel", "==", conferenceLevel),
      where("uidB", "==", uid),
      limit(1),
    ),
  );
  const row = left.docs[0] ?? right.docs[0];
  if (!row) {
    return null;
  }
  return parseMatch(row.id, row.data() as Record<string, unknown>);
}

export async function fetchRoommatePreference(uid: string): Promise<RoommatePreference | null> {
  const snap = await getDoc(doc(db, "roommatePreferences", uid));
  if (!snap.exists()) {
    return null;
  }
  return parsePreference(snap.id, snap.data() as Record<string, unknown>);
}

