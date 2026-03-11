import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  writeBatch,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { AppNotification, AppNotificationType } from "../types/social";
import { toIso } from "./firestoreUtils";

type NotificationInput = {
  type: AppNotificationType;
  title: string;
  body: string;
  metadata?: Record<string, string>;
};

export async function createUserNotification(
  uid: string,
  input: NotificationInput,
): Promise<void> {
  const ref = doc(collection(db, "users", uid, "notifications"));
  await setDoc(ref, {
    ...input,
    read: false,
    createdAt: serverTimestamp(),
  });
}

function parseNotification(
  id: string,
  data: Record<string, unknown>,
): AppNotification {
  return {
    id,
    type:
      typeof data.type === "string"
        ? (data.type as AppNotificationType)
        : "message",
    title: typeof data.title === "string" ? data.title : "Notification",
    body: typeof data.body === "string" ? data.body : "",
    read: Boolean(data.read),
    createdAt: toIso(data.createdAt),
    metadata:
      typeof data.metadata === "object" && data.metadata !== null
        ? (data.metadata as Record<string, string>)
        : undefined,
  };
}

export function subscribeNotifications(
  uid: string,
  onChange: (items: AppNotification[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(
    collection(db, "users", uid, "notifications"),
    orderBy("createdAt", "desc"),
    limit(50),
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(
        snap.docs.map((docSnap) =>
          parseNotification(docSnap.id, docSnap.data() as Record<string, unknown>),
        ),
      );
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn("Notifications subscription failed:", error);
      }
    },
  );
}

export async function fetchNotificationsOnce(uid: string): Promise<AppNotification[]> {
  const q = query(
    collection(db, "users", uid, "notifications"),
    orderBy("createdAt", "desc"),
    limit(50),
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) =>
    parseNotification(docSnap.id, docSnap.data() as Record<string, unknown>),
  );
}

export async function markAllNotificationsRead(uid: string): Promise<void> {
  const q = query(collection(db, "users", uid, "notifications"));
  const snap = await getDocs(q);
  const unread = snap.docs.filter((docSnap) => !docSnap.data().read);
  if (unread.length === 0) {
    return;
  }

  const batch = writeBatch(db);
  for (const docSnap of unread) {
    batch.set(docSnap.ref, { read: true, readAt: serverTimestamp() }, { merge: true });
  }
  await batch.commit();
}

export async function markNotificationRead(uid: string, notificationId: string): Promise<void> {
  const ref = doc(db, "users", uid, "notifications", notificationId);
  await setDoc(ref, { read: true, readAt: serverTimestamp() }, { merge: true });
}

export async function dismissNotification(uid: string, notificationId: string): Promise<void> {
  const ref = doc(db, "users", uid, "notifications", notificationId);
  await deleteDoc(ref);
}

export async function dismissAllNotifications(uid: string): Promise<void> {
  const snap = await getDocs(collection(db, "users", uid, "notifications"));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}
