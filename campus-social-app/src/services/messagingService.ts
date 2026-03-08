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
  runTransaction,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { PointAwardResult, ConversationItem, MessageItem, UserProfile } from "../types/social";
import { toIso } from "./firestoreUtils";
import { awardPointsToUser } from "./gamificationService";
import { createUserNotification } from "./notificationService";
import { fetchSchoolUsersOnce } from "./socialService";

function parseConversation(id: string, data: Record<string, unknown>): ConversationItem {
  const lastSeenRaw =
    typeof data.lastSeenBy === "object" && data.lastSeenBy !== null
      ? (data.lastSeenBy as Record<string, unknown>)
      : {};
  const lastSeenBy = Object.fromEntries(
    Object.entries(lastSeenRaw).map(([uid, value]) => [uid, toIso(value)]),
  );

  return {
    id,
    schoolId: typeof data.schoolId === "string" ? data.schoolId : "",
    participants: Array.isArray(data.participants)
      ? data.participants.filter((item): item is string => typeof item === "string")
      : [],
    participantNames:
      typeof data.participantNames === "object" && data.participantNames !== null
        ? (data.participantNames as Record<string, string>)
        : {},
    participantAvatars:
      typeof data.participantAvatars === "object" && data.participantAvatars !== null
        ? (data.participantAvatars as Record<string, string>)
        : {},
    lastMessage: typeof data.lastMessage === "string" ? data.lastMessage : "",
    lastMessageSenderId:
      typeof data.lastMessageSenderId === "string" ? data.lastMessageSenderId : undefined,
    unreadCounts:
      typeof data.unreadCounts === "object" && data.unreadCounts !== null
        ? (data.unreadCounts as Record<string, number>)
        : {},
    typingBy:
      typeof data.typingBy === "object" && data.typingBy !== null
        ? (data.typingBy as Record<string, boolean>)
        : {},
    lastSeenBy,
    updatedAt: toIso(data.updatedAt),
  };
}

function parseMessage(id: string, data: Record<string, unknown>): MessageItem {
  return {
    id,
    senderId: typeof data.senderId === "string" ? data.senderId : "",
    text: typeof data.text === "string" ? data.text : "",
    timestamp: toIso(data.timestamp),
    read: Boolean(data.read),
  };
}

export function conversationIdFor(a: string, b: string): string {
  return [a, b].sort().join("__");
}

export async function createOrGetConversation(
  actor: UserProfile,
  target: UserProfile,
): Promise<{ conversationId: string; created: boolean }> {
  const conversationId = conversationIdFor(actor.uid, target.uid);
  const ref = doc(db, "conversations", conversationId);

  const created = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const exists = snap.exists();
    const baseUnread = {
      [actor.uid]: 0,
      [target.uid]: 0,
    };
    tx.set(
      ref,
      {
        schoolId: actor.schoolId,
        participants: [actor.uid, target.uid].sort(),
        participantNames: {
          [actor.uid]: actor.displayName,
          [target.uid]: target.displayName,
        },
        participantAvatars: {
          [actor.uid]: actor.avatarUrl,
          [target.uid]: target.avatarUrl,
        },
        typingBy: {
          [actor.uid]: false,
          [target.uid]: false,
        },
        unreadCounts: exists
          ? ((snap.data().unreadCounts as Record<string, number> | undefined) ?? baseUnread)
          : baseUnread,
        lastMessage: exists
          ? typeof snap.data().lastMessage === "string"
            ? snap.data().lastMessage
            : ""
          : "",
        lastMessageSenderId: exists
          ? typeof snap.data().lastMessageSenderId === "string"
            ? snap.data().lastMessageSenderId
            : null
          : null,
        createdAt: exists ? snap.data().createdAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return !exists;
  });

  return { conversationId, created };
}

type SendMessageResult = {
  awarded: PointAwardResult | null;
  conversationId: string;
};

export async function sendMessageToStudent(
  actor: UserProfile,
  target: UserProfile,
  messageText: string,
): Promise<SendMessageResult | null> {
  const trimmed = messageText.trim();
  if (!trimmed) {
    return null;
  }

  const { conversationId, created } = await createOrGetConversation(actor, target);
  const conversationRef = doc(db, "conversations", conversationId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(conversationRef);
    if (!snap.exists()) {
      throw new Error("Conversation missing.");
    }
    const data = snap.data() as Record<string, unknown>;
    const participants = Array.isArray(data.participants)
      ? data.participants.filter((item): item is string => typeof item === "string")
      : [actor.uid, target.uid];
    const unreadCounts =
      typeof data.unreadCounts === "object" && data.unreadCounts !== null
        ? { ...(data.unreadCounts as Record<string, number>) }
        : {};
    const typingBy =
      typeof data.typingBy === "object" && data.typingBy !== null
        ? { ...(data.typingBy as Record<string, boolean>) }
        : {};

    participants.forEach((uid) => {
      if (uid === actor.uid) {
        unreadCounts[uid] = 0;
      } else {
        unreadCounts[uid] = (unreadCounts[uid] || 0) + 1;
      }
      typingBy[uid] = uid === actor.uid ? false : typingBy[uid] ?? false;
    });

    tx.set(
      conversationRef,
      {
        lastMessage: trimmed,
        lastMessageSenderId: actor.uid,
        unreadCounts,
        typingBy,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });

  await addDoc(collection(db, "conversations", conversationId, "messages"), {
    senderId: actor.uid,
    text: trimmed,
    timestamp: serverTimestamp(),
    read: false,
  });

  await createUserNotification(target.uid, {
    type: "message",
    title: "New Message",
    body: `${actor.displayName}: ${trimmed.slice(0, 80)}`,
    metadata: { userId: actor.uid, conversationId },
  });

  const awarded = created ? await awardPointsToUser(actor.uid, "messaging_new") : null;
  return { awarded, conversationId };
}

export function subscribeConversationsForUser(
  uid: string,
  schoolId: string,
  onChange: (items: ConversationItem[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(collection(db, "conversations"), orderBy("updatedAt", "desc"), limit(120));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((docSnap) => parseConversation(docSnap.id, docSnap.data() as Record<string, unknown>))
        .filter((conversation) => conversation.schoolId === schoolId)
        .filter((conversation) => conversation.participants.includes(uid));
      onChange(rows);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn("Conversations subscription failed:", error);
      }
    },
  );
}

export async function fetchConversationsForUser(
  uid: string,
  schoolId: string,
): Promise<ConversationItem[]> {
  const snap = await getDocs(
    query(collection(db, "conversations"), orderBy("updatedAt", "desc"), limit(120)),
  );
  return snap.docs
    .map((docSnap) => parseConversation(docSnap.id, docSnap.data() as Record<string, unknown>))
    .filter((conversation) => conversation.schoolId === schoolId)
    .filter((conversation) => conversation.participants.includes(uid));
}

export function subscribeMessages(
  conversationId: string,
  onChange: (items: MessageItem[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("timestamp", "asc"),
    limit(400),
  );

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((docSnap) =>
        parseMessage(docSnap.id, docSnap.data() as Record<string, unknown>),
      );
      onChange(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn("Messages subscription failed:", error);
      }
    },
  );
}

export function subscribeConversation(
  conversationId: string,
  onChange: (item: ConversationItem | null) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, "conversations", conversationId),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(parseConversation(snap.id, snap.data() as Record<string, unknown>));
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn("Conversation subscription failed:", error);
      }
    },
  );
}

export async function fetchMessagesOnce(conversationId: string): Promise<MessageItem[]> {
  const snap = await getDocs(
    query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("timestamp", "asc"),
      limit(400),
    ),
  );
  return snap.docs.map((docSnap) =>
    parseMessage(docSnap.id, docSnap.data() as Record<string, unknown>),
  );
}

export async function markConversationRead(
  conversationId: string,
  uid: string,
): Promise<void> {
  const conversationRef = doc(db, "conversations", conversationId);
  await setDoc(
    conversationRef,
    {
      unreadCounts: {
        [uid]: 0,
      },
      lastSeenBy: {
        [uid]: serverTimestamp(),
      },
    },
    { merge: true },
  );

  const snap = await getDocs(
    query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("timestamp", "desc"),
      limit(120),
    ),
  );
  const unreadIncoming = snap.docs.filter((docSnap) => {
    const data = docSnap.data() as Record<string, unknown>;
    return data.senderId !== uid && data.read !== true;
  });

  if (unreadIncoming.length === 0) {
    return;
  }

  const batch = writeBatch(db);
  unreadIncoming.forEach((docSnap) => {
    batch.set(docSnap.ref, { read: true, readAt: serverTimestamp() }, { merge: true });
  });
  await batch.commit();
}

export async function setTypingStatus(
  conversationId: string,
  uid: string,
  typing: boolean,
): Promise<void> {
  await updateDoc(doc(db, "conversations", conversationId), {
    [`typingBy.${uid}`]: typing,
    updatedAt: serverTimestamp(),
  });
}

export function getConversationUnreadCount(conversation: ConversationItem, uid: string): number {
  const map = conversation.unreadCounts ?? {};
  const raw = map[uid];
  return typeof raw === "number" && Number.isFinite(raw) ? Math.max(0, raw) : 0;
}

export function getTotalUnreadCount(conversations: ConversationItem[], uid: string): number {
  return conversations.reduce((sum, conversation) => sum + getConversationUnreadCount(conversation, uid), 0);
}

export async function findStudentsByName(
  schoolId: string,
  currentUid: string,
  queryText: string,
): Promise<UserProfile[]> {
  const trimmed = queryText.trim().toLowerCase();
  if (!trimmed) {
    return [];
  }
  const users = await fetchSchoolUsersOnce(schoolId);
  return users
    .filter((user) => user.uid !== currentUid)
    .filter((user) => user.displayName.toLowerCase().includes(trimmed))
    .slice(0, 25);
}

export async function fetchConversationById(conversationId: string): Promise<ConversationItem | null> {
  const snap = await getDoc(doc(db, "conversations", conversationId));
  if (!snap.exists()) {
    return null;
  }
  return parseConversation(snap.id, snap.data() as Record<string, unknown>);
}
