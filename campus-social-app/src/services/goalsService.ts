import {
  collection,
  doc,
  getDoc,
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
import { ChapterGoal, GoalContribution } from "../types/features";
import { UserProfile } from "../types/social";
import { toIso } from "./firestoreUtils";
import { createUserNotification } from "./notificationService";

function parseGoal(id: string, data: Record<string, unknown>): ChapterGoal {
  return {
    id,
    chapterId: typeof data.chapterId === "string" ? data.chapterId : "",
    schoolId: typeof data.schoolId === "string" ? data.schoolId : "",
    title: typeof data.title === "string" ? data.title : "",
    target: typeof data.target === "number" ? data.target : 0,
    unit: typeof data.unit === "string" ? data.unit : "items",
    deadline: typeof data.deadline === "string" ? data.deadline : "",
    category: typeof data.category === "string" ? data.category : "General",
    progress: typeof data.progress === "number" ? data.progress : 0,
    createdByUid: typeof data.createdByUid === "string" ? data.createdByUid : "",
    createdByName: typeof data.createdByName === "string" ? data.createdByName : "Officer",
    createdAt: toIso(data.createdAt),
  };
}

function parseContribution(id: string, data: Record<string, unknown>): GoalContribution {
  return {
    id,
    goalId: typeof data.goalId === "string" ? data.goalId : "",
    chapterId: typeof data.chapterId === "string" ? data.chapterId : "",
    uid: typeof data.uid === "string" ? data.uid : "",
    userName: typeof data.userName === "string" ? data.userName : "Member",
    amount: typeof data.amount === "number" ? data.amount : 0,
    note: typeof data.note === "string" ? data.note : "",
    approved: Boolean(data.approved),
    createdAt: toIso(data.createdAt),
    approvedBy: typeof data.approvedBy === "string" ? data.approvedBy : undefined,
  };
}

export function subscribeChapterGoals(chapterId: string, onChange: (rows: ChapterGoal[]) => void): Unsubscribe {
  const q = query(
    collection(db, "chapterGoals"),
    where("chapterId", "==", chapterId),
    orderBy("createdAt", "desc"),
    limit(30),
  );
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((row) => parseGoal(row.id, row.data() as Record<string, unknown>)));
  });
}

export async function createChapterGoal(
  actor: UserProfile,
  payload: Pick<ChapterGoal, "title" | "target" | "unit" | "deadline" | "category">,
): Promise<string> {
  const ref = doc(collection(db, "chapterGoals"));
  await setDoc(ref, {
    chapterId: actor.chapterId ?? "",
    schoolId: actor.schoolId,
    title: payload.title.trim(),
    target: payload.target,
    unit: payload.unit.trim(),
    deadline: payload.deadline,
    category: payload.category,
    progress: 0,
    createdByUid: actor.uid,
    createdByName: actor.displayName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function submitGoalContribution(
  actor: UserProfile,
  goalId: string,
  amount: number,
  note: string,
): Promise<string> {
  const ref = doc(collection(db, "goalContributions"));
  await setDoc(ref, {
    goalId,
    chapterId: actor.chapterId ?? "",
    uid: actor.uid,
    userName: actor.displayName,
    amount: Math.max(1, amount),
    note: note.trim(),
    approved: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function approveGoalContribution(
  contributionId: string,
  approverUid: string,
): Promise<void> {
  const contributionRef = doc(db, "goalContributions", contributionId);
  const snap = await getDoc(contributionRef);
  if (!snap.exists()) {
    return;
  }
  const data = parseContribution(snap.id, snap.data() as Record<string, unknown>);
  if (data.approved) {
    return;
  }
  await updateDoc(contributionRef, {
    approved: true,
    approvedBy: approverUid,
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "chapterGoals", data.goalId), {
    progress: increment(data.amount),
    updatedAt: serverTimestamp(),
  });
}

export async function maybeNotifyGoalHit100(goal: ChapterGoal): Promise<void> {
  if (goal.target <= 0) {
    return;
  }
  if (goal.progress < goal.target) {
    return;
  }
  await createUserNotification(goal.createdByUid, {
    type: "xp",
    title: "Chapter Goal Complete",
    body: `${goal.title} reached 100%.`,
    metadata: { goalId: goal.id },
  }).catch(() => undefined);
}

export function subscribeGoalContributions(
  chapterId: string,
  onChange: (rows: GoalContribution[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, "goalContributions"),
    where("chapterId", "==", chapterId),
    orderBy("createdAt", "desc"),
    limit(80),
  );
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((row) => parseContribution(row.id, row.data() as Record<string, unknown>)));
  });
}
