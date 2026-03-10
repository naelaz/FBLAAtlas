import {
  collection,
  doc,
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
import { OfficerTask } from "../types/features";
import { UserProfile } from "../types/social";
import { toIso } from "./firestoreUtils";

function parseTask(id: string, data: Record<string, unknown>): OfficerTask {
  return {
    id,
    chapterId: typeof data.chapterId === "string" ? data.chapterId : "",
    schoolId: typeof data.schoolId === "string" ? data.schoolId : "",
    title: typeof data.title === "string" ? data.title : "",
    description: typeof data.description === "string" ? data.description : "",
    assigneeUid: typeof data.assigneeUid === "string" ? data.assigneeUid : "",
    assigneeName: typeof data.assigneeName === "string" ? data.assigneeName : "Officer",
    dueDate: typeof data.dueDate === "string" ? data.dueDate : "",
    priority: data.priority === "high" || data.priority === "medium" || data.priority === "low" ? data.priority : "medium",
    status: data.status === "in_progress" || data.status === "done" ? data.status : "todo",
    checklist: Array.isArray(data.checklist)
      ? data.checklist
          .map((item) => {
            if (!item || typeof item !== "object") {
              return null;
            }
            const row = item as Record<string, unknown>;
            const text = typeof row.text === "string" ? row.text : "";
            if (!text) {
              return null;
            }
            return {
              id: typeof row.id === "string" ? row.id : `${text}_${Math.random().toString(36).slice(2, 7)}`,
              text,
              done: Boolean(row.done),
            };
          })
          .filter((item): item is { id: string; text: string; done: boolean } => Boolean(item))
      : [],
    commentsCount: typeof data.commentsCount === "number" ? data.commentsCount : 0,
    createdByUid: typeof data.createdByUid === "string" ? data.createdByUid : "",
    createdByName: typeof data.createdByName === "string" ? data.createdByName : "Officer",
    createdAt: toIso(data.createdAt),
  };
}

export function subscribeOfficerTasks(chapterId: string, onChange: (rows: OfficerTask[]) => void): Unsubscribe {
  const q = query(
    collection(db, "chapterTasks"),
    where("chapterId", "==", chapterId),
    orderBy("createdAt", "desc"),
    limit(200),
  );
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((row) => parseTask(row.id, row.data() as Record<string, unknown>)));
  });
}

export async function createOfficerTask(
  actor: UserProfile,
  payload: Omit<OfficerTask, "id" | "chapterId" | "schoolId" | "createdByUid" | "createdByName" | "createdAt" | "commentsCount">,
): Promise<string> {
  const ref = doc(collection(db, "chapterTasks"));
  await setDoc(ref, {
    chapterId: actor.chapterId ?? "",
    schoolId: actor.schoolId,
    title: payload.title.trim(),
    description: payload.description.trim(),
    assigneeUid: payload.assigneeUid,
    assigneeName: payload.assigneeName,
    dueDate: payload.dueDate,
    priority: payload.priority,
    status: payload.status,
    checklist: payload.checklist,
    commentsCount: 0,
    createdByUid: actor.uid,
    createdByName: actor.displayName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function moveOfficerTask(taskId: string, status: OfficerTask["status"]): Promise<void> {
  await updateDoc(doc(db, "chapterTasks", taskId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

