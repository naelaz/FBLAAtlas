import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { ChapterEventItem, MeetingNote } from "../types/features";
import { UserProfile } from "../types/social";
import { createUserNotification } from "./notificationService";
import { SchoolSearchResult } from "./schoolService";
import { toIso } from "./firestoreUtils";

export type Chapter = {
  id: string;
  name: string;
  school: string;
  city: string;
  state: string;
  memberCount: number;
  officers: string[];
};

export type ChapterJoinRequest = {
  chapterId: string;
  chapterName: string;
  userId: string;
  requesterName: string;
  requesterSchool: string;
  requestedAt: string;
  status: "pending" | "approved" | "denied";
};

export type AnnouncementItem = {
  id: string;
  message: string;
  createdBy: string;
  createdAt: string;
};

const CHAPTER_SEED_KEY = "seed_chapters_v1";

const SAMPLE_CHAPTERS: Array<Omit<Chapter, "id"> & { id: string }> = [
  {
    id: "ca-san-jose-fbla",
    name: "San Jose FBLA Chapter",
    school: "San Jose High School",
    city: "San Jose",
    state: "CA",
    memberCount: 42,
    officers: ["Avery Chen - President", "Maya Patel - Vice President", "Noah Brooks - Treasurer"],
  },
  {
    id: "tx-austin-fbla",
    name: "Austin Metro FBLA",
    school: "Austin High School",
    city: "Austin",
    state: "TX",
    memberCount: 36,
    officers: ["Luna Garcia - President", "Jordan Kim - Secretary"],
  },
  {
    id: "fl-orlando-fbla",
    name: "Orlando Future Leaders",
    school: "Orlando Central High",
    city: "Orlando",
    state: "FL",
    memberCount: 28,
    officers: ["Sam Rivera - President", "Riley Cooper - Reporter"],
  },
];

function parseChapter(id: string, data: Record<string, unknown>): Chapter {
  return {
    id,
    name: typeof data.name === "string" ? data.name : "FBLA Chapter",
    school: typeof data.school === "string" ? data.school : "",
    city: typeof data.city === "string" ? data.city : "",
    state: typeof data.state === "string" ? data.state : "",
    memberCount: typeof data.memberCount === "number" ? data.memberCount : 0,
    officers: Array.isArray(data.officers)
      ? data.officers.filter((item): item is string => typeof item === "string")
      : [],
  };
}

export async function ensureSampleChaptersSeeded(): Promise<void> {
  const seedRef = doc(db, "app_meta", CHAPTER_SEED_KEY);
  const seedSnap = await getDoc(seedRef);
  if (seedSnap.exists()) {
    return;
  }

  const tasks = SAMPLE_CHAPTERS.map((chapter) =>
    setDoc(
      doc(db, "chapters", chapter.id),
      {
        ...chapter,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ),
  );

  await Promise.all(tasks);
  await setDoc(seedRef, { seededAt: serverTimestamp() }, { merge: true });
}

export async function searchChapters(rawQuery: string): Promise<Chapter[]> {
  await ensureSampleChaptersSeeded();
  const snap = await getDocs(query(collection(db, "chapters"), orderBy("name"), limit(150)));
  const chapters = snap.docs.map((row) => parseChapter(row.id, row.data() as Record<string, unknown>));
  const queryText = rawQuery.trim().toLowerCase();
  if (!queryText) {
    return chapters;
  }
  return chapters.filter((chapter) =>
    `${chapter.name} ${chapter.school} ${chapter.city} ${chapter.state}`.toLowerCase().includes(queryText),
  );
}

export async function findChapterBySchoolName(schoolName: string): Promise<Chapter | null> {
  const normalized = schoolName.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  const chapters = await searchChapters(schoolName);
  return chapters.find((chapter) => chapter.school.trim().toLowerCase() === normalized) ?? null;
}

function chapterIdFromSchool(school: SchoolSearchResult): string {
  const parts = [school.state, school.city, school.name]
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return parts || "fbla-chapter";
}

export async function createChapterForSchool(
  school: SchoolSearchResult,
  creator: UserProfile,
): Promise<Chapter> {
  await ensureSampleChaptersSeeded();

  const baseId = chapterIdFromSchool(school);
  let id = baseId;
  let attempt = 1;
  // Ensure unique chapter document IDs.
  while ((await getDoc(doc(db, "chapters", id))).exists()) {
    attempt += 1;
    id = `${baseId}-${attempt}`;
  }

  const chapter: Chapter = {
    id,
    name: `${school.name} FBLA Chapter`,
    school: school.name,
    city: school.city,
    state: school.state,
    memberCount: 1,
    officers: [`${creator.displayName} - President`],
  };

  await setDoc(doc(db, "chapters", id), {
    ...chapter,
    createdByUid: creator.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return chapter;
}

export async function submitChapterJoinRequest(chapter: Chapter, user: UserProfile): Promise<void> {
  const ref = doc(db, "chapterRequests", chapter.id, "requests", user.uid);
  await setDoc(
    ref,
    {
      chapterId: chapter.id,
      chapterName: chapter.name,
      chapterSchool: chapter.school,
      chapterCity: chapter.city,
      chapterState: chapter.state,
      userId: user.uid,
      requesterName: user.displayName,
      requesterSchool: user.schoolName,
      requesterState: user.state ?? "",
      status: "pending",
      requestedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function getChapterJoinRequestStatus(
  chapterId: string,
  userId: string,
): Promise<ChapterJoinRequest["status"] | null> {
  const snap = await getDoc(doc(db, "chapterRequests", chapterId, "requests", userId));
  if (!snap.exists()) {
    return null;
  }
  const status = snap.data().status;
  if (status === "pending" || status === "approved" || status === "denied") {
    return status;
  }
  return null;
}

export async function fetchPendingChapterJoinRequests(): Promise<ChapterJoinRequest[]> {
  const parentSnap = await getDocs(collection(db, "chapterRequests"));
  const rows: ChapterJoinRequest[] = [];

  for (const chapterDoc of parentSnap.docs) {
    const requestSnap = await getDocs(
      query(
        collection(db, "chapterRequests", chapterDoc.id, "requests"),
        where("status", "==", "pending"),
        orderBy("requestedAt", "desc"),
        limit(100),
      ),
    );
    requestSnap.forEach((requestDoc) => {
      const data = requestDoc.data() as Record<string, unknown>;
      rows.push({
        chapterId: chapterDoc.id,
        chapterName: typeof data.chapterName === "string" ? data.chapterName : chapterDoc.id,
        userId: requestDoc.id,
        requesterName: typeof data.requesterName === "string" ? data.requesterName : "Member",
        requesterSchool: typeof data.requesterSchool === "string" ? data.requesterSchool : "",
        requestedAt: toIso(data.requestedAt),
        status: "pending",
      });
    });
  }

  return rows.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
}

export async function approveChapterJoinRequest(
  chapterId: string,
  userId: string,
  adminUid: string,
): Promise<void> {
  const chapterRef = doc(db, "chapters", chapterId);
  const requestRef = doc(db, "chapterRequests", chapterId, "requests", userId);
  const userRef = doc(db, "users", userId);

  const chapter = await runTransaction(db, async (tx) => {
    const [chapterSnap, requestSnap] = await Promise.all([tx.get(chapterRef), tx.get(requestRef)]);
    if (!chapterSnap.exists() || !requestSnap.exists()) {
      throw new Error("Missing chapter or request.");
    }
    const requestData = requestSnap.data() as Record<string, unknown>;
    const status = requestData.status;
    if (status === "approved") {
      return parseChapter(chapterSnap.id, chapterSnap.data() as Record<string, unknown>);
    }
    const chapterData = parseChapter(chapterSnap.id, chapterSnap.data() as Record<string, unknown>);

    tx.set(
      requestRef,
      {
        status: "approved",
        reviewedBy: adminUid,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    tx.set(
      userRef,
      {
        chapterId: chapterData.id,
        chapterName: chapterData.name,
        schoolName: chapterData.school,
        schoolCity: chapterData.city,
        state: chapterData.state,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    tx.set(
      chapterRef,
      {
        memberCount: increment(1),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return chapterData;
  });

  await createUserNotification(userId, {
    type: "follow",
    title: "Chapter Request Approved",
    body: `You are now a member of ${chapter.name}.`,
    metadata: { chapterId, chapterName: chapter.name },
  });
}

export async function denyChapterJoinRequest(
  chapterId: string,
  userId: string,
  adminUid: string,
): Promise<void> {
  const requestRef = doc(db, "chapterRequests", chapterId, "requests", userId);
  await updateDoc(requestRef, {
    status: "denied",
    reviewedBy: adminUid,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await createUserNotification(userId, {
    type: "message",
    title: "Chapter Request Update",
    body: "Your chapter join request was denied.",
    metadata: { chapterId },
  });
}

export async function postAnnouncement(
  message: string,
  createdBy: string,
  createdByUid: string,
): Promise<void> {
  const ref = doc(collection(db, "announcements"));
  await setDoc(ref, {
    message: message.trim(),
    createdBy,
    createdByUid,
    createdAt: serverTimestamp(),
  });
}

export async function fetchLatestAnnouncement(): Promise<AnnouncementItem | null> {
  const snap = await getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(1)));
  const row = snap.docs[0];
  if (!row) {
    return null;
  }
  const data = row.data() as Record<string, unknown>;
  return {
    id: row.id,
    message: typeof data.message === "string" ? data.message : "",
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "Administrator",
    createdAt: toIso(data.createdAt),
  };
}

function parseChapterEvent(id: string, data: Record<string, unknown>): ChapterEventItem {
  return {
    id,
    chapterId: typeof data.chapterId === "string" ? data.chapterId : "",
    schoolId: typeof data.schoolId === "string" ? data.schoolId : "",
    title: typeof data.title === "string" ? data.title : "",
    description: typeof data.description === "string" ? data.description : "",
    location: typeof data.location === "string" ? data.location : "",
    dateTime: typeof data.dateTime === "string" ? data.dateTime : "",
    mandatory: Boolean(data.mandatory),
    rsvpEnabled: data.rsvpEnabled !== false,
    attendeeIds: Array.isArray(data.attendeeIds)
      ? data.attendeeIds.filter((item): item is string => typeof item === "string")
      : [],
    capacity: typeof data.capacity === "number" ? data.capacity : undefined,
    createdByUid: typeof data.createdByUid === "string" ? data.createdByUid : "",
    createdByName: typeof data.createdByName === "string" ? data.createdByName : "Officer",
    createdAt: toIso(data.createdAt),
  };
}

function parseMeetingNote(id: string, data: Record<string, unknown>): MeetingNote {
  return {
    id,
    chapterId: typeof data.chapterId === "string" ? data.chapterId : "",
    schoolId: typeof data.schoolId === "string" ? data.schoolId : "",
    meetingDate: typeof data.meetingDate === "string" ? data.meetingDate : "",
    agenda: Array.isArray(data.agenda) ? data.agenda.filter((x): x is string => typeof x === "string") : [],
    decisions: Array.isArray(data.decisions)
      ? data.decisions.filter((x): x is string => typeof x === "string")
      : [],
    attendees: Array.isArray(data.attendees)
      ? data.attendees
          .map((item) => {
            if (!item || typeof item !== "object") {
              return null;
            }
            const row = item as Record<string, unknown>;
            const uid = typeof row.uid === "string" ? row.uid : "";
            const name = typeof row.name === "string" ? row.name : "";
            if (!uid || !name) {
              return null;
            }
            return { uid, name };
          })
          .filter((item): item is { uid: string; name: string } => Boolean(item))
      : [],
    actionItems: Array.isArray(data.actionItems)
      ? data.actionItems
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
              id: typeof row.id === "string" ? row.id : `${text}_${Math.random().toString(36).slice(2, 8)}`,
              text,
              assigneeUid: typeof row.assigneeUid === "string" ? row.assigneeUid : "",
              assigneeName: typeof row.assigneeName === "string" ? row.assigneeName : "",
              dueDate: typeof row.dueDate === "string" ? row.dueDate : "",
              done: Boolean(row.done),
            };
          })
          .filter((item): item is MeetingNote["actionItems"][number] => Boolean(item))
      : [],
    createdByUid: typeof data.createdByUid === "string" ? data.createdByUid : "",
    createdByName: typeof data.createdByName === "string" ? data.createdByName : "Officer",
    createdAt: toIso(data.createdAt),
  };
}

export async function createChapterEvent(
  actor: UserProfile,
  payload: Omit<ChapterEventItem, "id" | "chapterId" | "schoolId" | "attendeeIds" | "createdByUid" | "createdByName" | "createdAt">,
): Promise<string> {
  const ref = doc(collection(db, "chapterEvents"));
  await setDoc(ref, {
    chapterId: actor.chapterId ?? "",
    schoolId: actor.schoolId,
    title: payload.title,
    description: payload.description,
    location: payload.location,
    dateTime: payload.dateTime,
    mandatory: payload.mandatory,
    rsvpEnabled: payload.rsvpEnabled,
    capacity: payload.capacity ?? null,
    attendeeIds: [],
    createdByUid: actor.uid,
    createdByName: actor.displayName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  if (actor.chapterId) {
    const chapterUsers = await getDocs(
      query(collection(db, "users"), where("chapterId", "==", actor.chapterId), limit(300)),
    );
    await Promise.all(
      chapterUsers.docs
        .map((userDoc) => userDoc.id)
        .filter((uid) => uid !== actor.uid)
        .map((uid) =>
          createUserNotification(uid, {
            type: "message",
            title: "New Chapter Event",
            body: `${payload.title} was posted by ${actor.displayName}.`,
            metadata: {
              eventId: ref.id,
              chapterId: actor.chapterId ?? "",
              mandatory: payload.mandatory ? "true" : "false",
            },
          }).catch(() => undefined),
        ),
    );
  }
  return ref.id;
}

export async function fetchChapterEvents(chapterId: string): Promise<ChapterEventItem[]> {
  const snap = await getDocs(
    query(collection(db, "chapterEvents"), where("chapterId", "==", chapterId), orderBy("dateTime", "asc"), limit(200)),
  );
  return snap.docs.map((row) => parseChapterEvent(row.id, row.data() as Record<string, unknown>));
}

export async function toggleChapterEventRsvp(eventId: string, uid: string): Promise<void> {
  const ref = doc(db, "chapterEvents", eventId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      return;
    }
    const current = parseChapterEvent(snap.id, snap.data() as Record<string, unknown>);
    const next = current.attendeeIds.includes(uid)
      ? current.attendeeIds.filter((id) => id !== uid)
      : [...current.attendeeIds, uid];
    tx.set(ref, { attendeeIds: next, updatedAt: serverTimestamp() }, { merge: true });
  });
}

export async function createMeetingNote(
  actor: UserProfile,
  payload: Omit<MeetingNote, "id" | "chapterId" | "schoolId" | "createdByUid" | "createdByName" | "createdAt">,
): Promise<string> {
  const ref = doc(collection(db, "chapterMeetingNotes"));
  await setDoc(ref, {
    chapterId: actor.chapterId ?? "",
    schoolId: actor.schoolId,
    meetingDate: payload.meetingDate,
    agenda: payload.agenda,
    decisions: payload.decisions,
    attendees: payload.attendees,
    actionItems: payload.actionItems,
    createdByUid: actor.uid,
    createdByName: actor.displayName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function fetchMeetingNotes(chapterId: string): Promise<MeetingNote[]> {
  const snap = await getDocs(
    query(collection(db, "chapterMeetingNotes"), where("chapterId", "==", chapterId), orderBy("meetingDate", "desc"), limit(120)),
  );
  return snap.docs.map((row) => parseMeetingNote(row.id, row.data() as Record<string, unknown>));
}
