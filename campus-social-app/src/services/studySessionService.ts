import {
  addDoc,
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
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { StudySession, StudySessionMessage } from "../types/features";
import { UserProfile } from "../types/social";
import { toIso } from "./firestoreUtils";

function parseSession(id: string, data: Record<string, unknown>): StudySession {
  return {
    id,
    chapterId: typeof data.chapterId === "string" ? data.chapterId : "",
    schoolId: typeof data.schoolId === "string" ? data.schoolId : "",
    eventIds: Array.isArray(data.eventIds) ? data.eventIds.filter((x): x is string => typeof x === "string") : [],
    eventNames: Array.isArray(data.eventNames)
      ? data.eventNames.filter((x): x is string => typeof x === "string")
      : [],
    description: typeof data.description === "string" ? data.description : "",
    maxParticipants: typeof data.maxParticipants === "number" ? data.maxParticipants : 4,
    isChapterOnly: data.isChapterOnly !== false,
    mode: data.mode === "quiz_each_other" ? "quiz_each_other" : "practice_together",
    createdByUid: typeof data.createdByUid === "string" ? data.createdByUid : "",
    createdByName: typeof data.createdByName === "string" ? data.createdByName : "Member",
    participantIds: Array.isArray(data.participantIds)
      ? data.participantIds.filter((x): x is string => typeof x === "string")
      : [],
    startedAt: toIso(data.startedAt),
    scheduledFor: typeof data.scheduledFor === "string" ? data.scheduledFor : undefined,
    endedAt: typeof data.endedAt === "string" ? data.endedAt : undefined,
    status: data.status === "ended" ? "ended" : "active",
  };
}

function parseMessage(id: string, data: Record<string, unknown>): StudySessionMessage {
  return {
    id,
    sessionId: typeof data.sessionId === "string" ? data.sessionId : "",
    uid: typeof data.uid === "string" ? data.uid : "",
    name: typeof data.name === "string" ? data.name : "Member",
    text: typeof data.text === "string" ? data.text : "",
    createdAt: toIso(data.createdAt),
  };
}

export async function createStudySession(
  actor: UserProfile,
  payload: {
    eventIds: string[];
    eventNames: string[];
    description: string;
    maxParticipants: number;
    isChapterOnly: boolean;
    mode: StudySession["mode"];
    scheduledFor?: string;
  },
): Promise<string> {
  const ref = doc(collection(db, "studySessions"));
  await setDoc(ref, {
    chapterId: actor.chapterId ?? "",
    schoolId: actor.schoolId,
    eventIds: payload.eventIds,
    eventNames: payload.eventNames,
    description: payload.description.trim(),
    maxParticipants: Math.max(2, Math.min(8, payload.maxParticipants)),
    isChapterOnly: payload.isChapterOnly,
    mode: payload.mode,
    createdByUid: actor.uid,
    createdByName: actor.displayName,
    participantIds: [actor.uid],
    startedAt: serverTimestamp(),
    scheduledFor: payload.scheduledFor ?? null,
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await setDoc(
    doc(db, "studySessions", ref.id, "participants", actor.uid),
    { uid: actor.uid, name: actor.displayName, joinedAt: serverTimestamp() },
    { merge: true },
  );
  return ref.id;
}

export function subscribeStudySessions(
  schoolId: string,
  onChange: (rows: StudySession[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(
    collection(db, "studySessions"),
    where("schoolId", "==", schoolId),
    limit(60),
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((row) => parseSession(row.id, row.data() as Record<string, unknown>))
        .filter((row) => row.status === "active")
        .sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt));
      onChange(rows);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn("Study sessions subscription failed:", error);
      }
      onChange([]);
    },
  );
}

export async function joinStudySession(sessionId: string, user: UserProfile): Promise<void> {
  const ref = doc(db, "studySessions", sessionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return;
  }
  const session = parseSession(snap.id, snap.data() as Record<string, unknown>);
  if (session.participantIds.includes(user.uid)) {
    return;
  }
  if (session.participantIds.length >= session.maxParticipants) {
    throw new Error("This study session is full.");
  }
  await updateDoc(ref, {
    participantIds: [...session.participantIds, user.uid],
    updatedAt: serverTimestamp(),
  });
  await setDoc(
    doc(db, "studySessions", sessionId, "participants", user.uid),
    { uid: user.uid, name: user.displayName, joinedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function endStudySession(sessionId: string): Promise<void> {
  await updateDoc(doc(db, "studySessions", sessionId), {
    status: "ended",
    endedAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
}

export function subscribeStudyMessages(
  sessionId: string,
  onChange: (rows: StudySessionMessage[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, "studySessions", sessionId, "messages"),
    orderBy("createdAt", "asc"),
    limit(300),
  );
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((row) => parseMessage(row.id, row.data() as Record<string, unknown>)));
  });
}

export async function sendStudyMessage(sessionId: string, user: UserProfile, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) {
    return;
  }
  await addDoc(collection(db, "studySessions", sessionId, "messages"), {
    sessionId,
    uid: user.uid,
    name: user.displayName,
    text: trimmed,
    createdAt: serverTimestamp(),
  });
}

export async function fetchStudySessionById(sessionId: string): Promise<StudySession | null> {
  const snap = await getDoc(doc(db, "studySessions", sessionId));
  if (!snap.exists()) {
    return null;
  }
  return parseSession(snap.id, snap.data() as Record<string, unknown>);
}

export async function fetchStudyParticipantsDuration(
  sessionId: string,
): Promise<Array<{ uid: string; name: string; joinedAt: string }>> {
  const snap = await getDocs(query(collection(db, "studySessions", sessionId, "participants"), limit(50)));
  return snap.docs.map((row) => {
    const data = row.data() as Record<string, unknown>;
    return {
      uid: row.id,
      name: typeof data.name === "string" ? data.name : "Member",
      joinedAt: toIso(data.joinedAt),
    };
  });
}
