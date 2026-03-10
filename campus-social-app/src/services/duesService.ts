import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Unsubscribe,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { ChapterDuesSettings, DuesRecord } from "../types/features";
import { toIso } from "./firestoreUtils";

const DEFAULT_DUES: ChapterDuesSettings = {
  amount: 0,
  deadline: "",
  paymentLink: "",
};

export async function fetchChapterDuesSettings(chapterId: string): Promise<ChapterDuesSettings> {
  const snap = await getDoc(doc(db, "chapterDuesSettings", chapterId));
  if (!snap.exists()) {
    return DEFAULT_DUES;
  }
  const data = snap.data() as Record<string, unknown>;
  return {
    amount: typeof data.amount === "number" ? data.amount : 0,
    deadline: typeof data.deadline === "string" ? data.deadline : "",
    paymentLink: typeof data.paymentLink === "string" ? data.paymentLink : "",
  };
}

export async function setChapterDuesSettings(
  chapterId: string,
  settings: ChapterDuesSettings,
): Promise<void> {
  await setDoc(
    doc(db, "chapterDuesSettings", chapterId),
    {
      ...settings,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function subscribeChapterDuesStatus(
  chapterId: string,
  onChange: (rows: DuesRecord[]) => void,
): Unsubscribe {
  const q = query(collection(db, "chapterDues", chapterId, "members"), limit(500));
  return onSnapshot(q, (snap) => {
    onChange(
      snap.docs.map((row) => {
        const data = row.data() as Record<string, unknown>;
        return {
          uid: row.id,
          paid: Boolean(data.paid),
          updatedAt: toIso(data.updatedAt),
        };
      }),
    );
  });
}

export async function setMemberDuesPaid(chapterId: string, uid: string, paid: boolean): Promise<void> {
  await setDoc(
    doc(db, "chapterDues", chapterId, "members", uid),
    {
      paid,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function fetchMemberDuesStatus(chapterId: string, uid: string): Promise<DuesRecord | null> {
  const snap = await getDoc(doc(db, "chapterDues", chapterId, "members", uid));
  if (!snap.exists()) {
    return null;
  }
  const data = snap.data() as Record<string, unknown>;
  return {
    uid,
    paid: Boolean(data.paid),
    updatedAt: toIso(data.updatedAt),
  };
}

export async function markAllChapterMembersUnpaid(chapterId: string): Promise<void> {
  const snap = await getDocs(query(collection(db, "chapterDues", chapterId, "members"), limit(1000)));
  await Promise.all(
    snap.docs.map((row) =>
      setDoc(
        row.ref,
        {
          paid: false,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
    ),
  );
}

