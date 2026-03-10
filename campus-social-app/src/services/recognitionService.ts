import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
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
import { RecognitionPlacement } from "../types/features";
import { UserProfile } from "../types/social";
import { toIso } from "./firestoreUtils";
import { createUserNotification } from "./notificationService";

const RECOGNITION_COLLECTION = "recognitionPlacements";

type PlacementReaction = "celebrate" | "clap" | "fire";

function parsePlacement(id: string, data: Record<string, unknown>): RecognitionPlacement {
  return {
    id,
    chapterId: typeof data.chapterId === "string" ? data.chapterId : "",
    schoolId: typeof data.schoolId === "string" ? data.schoolId : "",
    uid: typeof data.uid === "string" ? data.uid : "",
    userName: typeof data.userName === "string" ? data.userName : "Member",
    eventName: typeof data.eventName === "string" ? data.eventName : "",
    place:
      data.place === "1st" ||
      data.place === "2nd" ||
      data.place === "3rd" ||
      data.place === "Top 10" ||
      data.place === "Top 20" ||
      data.place === "Qualified" ||
      data.place === "Participant"
        ? data.place
        : "Participant",
    level: data.level === "DLC" || data.level === "SLC" || data.level === "NLC" ? data.level : "DLC",
    year: typeof data.year === "number" ? data.year : new Date().getFullYear(),
    verified: Boolean(data.verified),
    pending: data.pending !== false,
    reactions:
      typeof data.reactions === "object" && data.reactions !== null
        ? (data.reactions as Record<string, number>)
        : {},
    createdAt: toIso(data.createdAt),
    verifiedBy: typeof data.verifiedBy === "string" ? data.verifiedBy : undefined,
  };
}

async function fetchSchoolUserIds(schoolId: string): Promise<string[]> {
  const snap = await getDocs(
    query(collection(db, "users"), where("schoolId", "==", schoolId), limit(300)),
  );
  return snap.docs.map((row) => row.id);
}

export async function submitPlacementToRecognitionWall(
  user: UserProfile,
  payload: {
    eventName: string;
    place: RecognitionPlacement["place"];
    level: RecognitionPlacement["level"];
    year: number;
  },
): Promise<string> {
  const ref = doc(collection(db, RECOGNITION_COLLECTION));
  await setDoc(ref, {
    chapterId: user.chapterId ?? "",
    schoolId: user.schoolId,
    uid: user.uid,
    userName: user.displayName,
    eventName: payload.eventName,
    place: payload.place,
    level: payload.level,
    year: payload.year,
    pending: true,
    verified: false,
    reactions: {
      celebrate: 0,
      clap: 0,
      fire: 0,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (payload.level === "NLC") {
    const userIds = await fetchSchoolUserIds(user.schoolId);
    await Promise.all(
      userIds
        .filter((uid) => uid !== user.uid)
        .map((uid) =>
          createUserNotification(uid, {
            type: "message",
            title: "Chapter Win",
            body: `${user.displayName} placed ${payload.place} in ${payload.eventName} at NLC.`,
            metadata: {
              placementId: ref.id,
              level: payload.level,
            },
          }).catch(() => undefined),
        ),
    );
  }

  return ref.id;
}

export function subscribeRecognitionPlacements(
  schoolId: string,
  onChange: (rows: RecognitionPlacement[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(
    collection(db, RECOGNITION_COLLECTION),
    where("schoolId", "==", schoolId),
    limit(120),
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((row) => parsePlacement(row.id, row.data() as Record<string, unknown>))
        .filter((row) => row.pending || row.verified)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      onChange(rows);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn("Recognition placements subscription failed:", error);
      }
      onChange([]);
    },
  );
}

export async function verifyRecognitionPlacement(placementId: string, verifierUid: string): Promise<void> {
  await updateDoc(doc(db, RECOGNITION_COLLECTION, placementId), {
    pending: false,
    verified: true,
    verifiedBy: verifierUid,
    verifiedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function removeRecognitionPlacement(placementId: string): Promise<void> {
  await deleteDoc(doc(db, RECOGNITION_COLLECTION, placementId));
}

export async function reactToRecognitionPlacement(
  placementId: string,
  reaction: PlacementReaction,
  actorName: string,
): Promise<void> {
  await updateDoc(doc(db, RECOGNITION_COLLECTION, placementId), {
    [`reactions.${reaction}`]: increment(1),
    lastReactionBy: actorName,
    updatedAt: serverTimestamp(),
  });
}
