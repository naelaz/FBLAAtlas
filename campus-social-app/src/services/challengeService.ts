import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  where,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { UserProfile } from "../types/social";
import { DuelLeaderboardRow, PracticeChallenge } from "../types/features";
import { toIso } from "./firestoreUtils";
import { createUserNotification } from "./notificationService";

const CHALLENGE_EXPIRY_MS = 24 * 60 * 60 * 1000;

function parseChallenge(id: string, data: Record<string, unknown>): PracticeChallenge {
  return {
    id,
    chapterId: typeof data.chapterId === "string" ? data.chapterId : "",
    schoolId: typeof data.schoolId === "string" ? data.schoolId : "",
    eventId: typeof data.eventId === "string" ? data.eventId : "",
    eventName: typeof data.eventName === "string" ? data.eventName : "FBLA Event",
    challengerUid: typeof data.challengerUid === "string" ? data.challengerUid : "",
    challengerName: typeof data.challengerName === "string" ? data.challengerName : "Member",
    targetUid: typeof data.targetUid === "string" ? data.targetUid : "",
    targetName: typeof data.targetName === "string" ? data.targetName : "Member",
    status:
      data.status === "pending" ||
      data.status === "accepted" ||
      data.status === "declined" ||
      data.status === "expired" ||
      data.status === "active" ||
      data.status === "completed"
        ? data.status
        : "pending",
    createdAt: toIso(data.createdAt),
    expiresAt: toIso(data.expiresAt),
    startedAt: typeof data.startedAt === "string" ? data.startedAt : toIso(data.startedAt),
    completedAt: typeof data.completedAt === "string" ? data.completedAt : toIso(data.completedAt),
    challengerScore: typeof data.challengerScore === "number" ? data.challengerScore : undefined,
    targetScore: typeof data.targetScore === "number" ? data.targetScore : undefined,
    challengerCorrect: typeof data.challengerCorrect === "number" ? data.challengerCorrect : undefined,
    targetCorrect: typeof data.targetCorrect === "number" ? data.targetCorrect : undefined,
    winnerUid: typeof data.winnerUid === "string" ? data.winnerUid : undefined,
  };
}

export async function createPracticeChallenge(
  challenger: UserProfile,
  target: UserProfile,
  eventId: string,
  eventName: string,
): Promise<string> {
  const ref = doc(collection(db, "challenges"));
  const expires = new Date(Date.now() + CHALLENGE_EXPIRY_MS).toISOString();
  await setDoc(ref, {
    chapterId: challenger.chapterId ?? "",
    schoolId: challenger.schoolId,
    eventId,
    eventName,
    challengerUid: challenger.uid,
    challengerName: challenger.displayName,
    targetUid: target.uid,
    targetName: target.displayName,
    status: "pending",
    createdAt: serverTimestamp(),
    expiresAt: expires,
  });
  await createUserNotification(target.uid, {
    type: "message",
    title: "Practice Challenge",
    body: `${challenger.displayName} challenged you to ${eventName}.`,
    metadata: {
      challengeId: ref.id,
      eventId,
      eventName,
    },
  });
  return ref.id;
}

export function subscribeIncomingChallenges(
  uid: string,
  onChange: (items: PracticeChallenge[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(
    collection(db, "challenges"),
    where("targetUid", "==", uid),
    limit(20),
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((row) => parseChallenge(row.id, row.data() as Record<string, unknown>))
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      const now = Date.now();
      onChange(
        rows.filter((row) => {
          if (row.status !== "pending") {
            return false;
          }
          const expiry = Date.parse(row.expiresAt);
          return Number.isFinite(expiry) ? expiry > now : true;
        }),
      );
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn("Incoming challenge subscription failed:", error);
      }
      onChange([]);
    },
  );
}

export async function respondToChallenge(challengeId: string, accept: boolean): Promise<void> {
  const ref = doc(db, "challenges", challengeId);
  await setDoc(
    ref,
    {
      status: accept ? "accepted" : "declined",
      respondedAt: serverTimestamp(),
      ...(accept ? { startedAt: new Date().toISOString() } : {}),
    },
    { merge: true },
  );
}

export async function activateAcceptedChallenge(challengeId: string): Promise<void> {
  await setDoc(
    doc(db, "challenges", challengeId),
    {
      status: "active",
      startedAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function submitChallengeResult(
  challengeId: string,
  uid: string,
  scorePercent: number,
  correctAnswers: number,
): Promise<{ winnerUid: string | null; challenge: PracticeChallenge | null }> {
  const ref = doc(db, "challenges", challengeId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      return { winnerUid: null, challenge: null };
    }
    const data = snap.data() as Record<string, unknown>;
    const challenge = parseChallenge(challengeId, data);

    const next: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
      status: "active",
    };

    if (uid === challenge.challengerUid) {
      next.challengerScore = scorePercent;
      next.challengerCorrect = correctAnswers;
    } else if (uid === challenge.targetUid) {
      next.targetScore = scorePercent;
      next.targetCorrect = correctAnswers;
    } else {
      return { winnerUid: null, challenge };
    }

    const challengerScore =
      uid === challenge.challengerUid
        ? scorePercent
        : typeof data.challengerScore === "number"
          ? data.challengerScore
          : null;
    const targetScore =
      uid === challenge.targetUid
        ? scorePercent
        : typeof data.targetScore === "number"
          ? data.targetScore
          : null;

    if (typeof challengerScore === "number" && typeof targetScore === "number") {
      next.status = "completed";
      next.completedAt = new Date().toISOString();
      if (challengerScore > targetScore) {
        next.winnerUid = challenge.challengerUid;
      } else if (targetScore > challengerScore) {
        next.winnerUid = challenge.targetUid;
      } else {
        next.winnerUid = null;
      }
    }

    tx.set(ref, next, { merge: true });
    return {
      winnerUid: (next.winnerUid as string | null | undefined) ?? null,
      challenge: parseChallenge(challengeId, { ...data, ...next }),
    };
  });
}

export async function fetchChallengeById(challengeId: string): Promise<PracticeChallenge | null> {
  const snap = await getDoc(doc(db, "challenges", challengeId));
  if (!snap.exists()) {
    return null;
  }
  return parseChallenge(snap.id, snap.data() as Record<string, unknown>);
}

export async function fetchDuelLeaderboard(schoolId: string): Promise<DuelLeaderboardRow[]> {
  const snap = await getDocs(
    query(
      collection(db, "challenges"),
      where("schoolId", "==", schoolId),
      limit(600),
    ),
  );

  const table = new Map<string, DuelLeaderboardRow>();
  snap.docs.forEach((row) => {
    const item = parseChallenge(row.id, row.data() as Record<string, unknown>);
    if (item.status !== "completed") {
      return;
    }
    const challenger = table.get(item.challengerUid) ?? {
      uid: item.challengerUid,
      name: item.challengerName,
      wins: 0,
      losses: 0,
      totalDuels: 0,
      winRate: 0,
    };
    const target = table.get(item.targetUid) ?? {
      uid: item.targetUid,
      name: item.targetName,
      wins: 0,
      losses: 0,
      totalDuels: 0,
      winRate: 0,
    };
    challenger.totalDuels += 1;
    target.totalDuels += 1;
    if (item.winnerUid === item.challengerUid) {
      challenger.wins += 1;
      target.losses += 1;
    } else if (item.winnerUid === item.targetUid) {
      target.wins += 1;
      challenger.losses += 1;
    }
    table.set(challenger.uid, challenger);
    table.set(target.uid, target);
  });

  return [...table.values()]
    .map((row) => ({
      ...row,
      winRate: row.totalDuels > 0 ? row.wins / row.totalDuels : 0,
    }))
    .filter((row) => row.totalDuels >= 5)
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);
}

export async function fetchUserDuelStats(uid: string): Promise<{ wins: number; losses: number; rivalUid?: string }> {
  const snap = await getDocs(
    query(
      collection(db, "challenges"),
      where("status", "==", "completed"),
      limit(600),
    ),
  );
  let wins = 0;
  let losses = 0;
  const rivals = new Map<string, number>();
  snap.docs.forEach((row) => {
    const item = parseChallenge(row.id, row.data() as Record<string, unknown>);
    if (item.challengerUid !== uid && item.targetUid !== uid) {
      return;
    }
    const rival = item.challengerUid === uid ? item.targetUid : item.challengerUid;
    rivals.set(rival, (rivals.get(rival) ?? 0) + 1);
    if (item.winnerUid === uid) {
      wins += 1;
    } else if (item.winnerUid) {
      losses += 1;
    }
  });
  const rivalUid = [...rivals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return { wins, losses, rivalUid };
}
