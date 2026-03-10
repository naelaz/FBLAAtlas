import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { UserProfile } from "../types/social";

export type AlumniMentorProfile = {
  uid: string;
  name: string;
  schoolName: string;
  chapterName: string;
  eventAreas: string[];
};

export async function fetchAlumniMentors(schoolId?: string): Promise<AlumniMentorProfile[]> {
  const constraints = [
    where("profileType", "==", "alumni"),
    where("alumniMentorAvailable", "==", true),
    limit(60),
  ];
  if (schoolId) {
    constraints.push(where("schoolId", "==", schoolId));
  }
  const snap = await getDocs(query(collection(db, "users"), ...constraints));
  return snap.docs.map((row) => {
    const data = row.data() as Record<string, unknown>;
    return {
      uid: row.id,
      name: typeof data.displayName === "string" ? data.displayName : "Alumni Mentor",
      schoolName: typeof data.schoolName === "string" ? data.schoolName : "",
      chapterName: typeof data.chapterName === "string" ? data.chapterName : "",
      eventAreas: Array.isArray(data.mentorEventAreas)
        ? data.mentorEventAreas.filter((item): item is string => typeof item === "string")
        : [],
    };
  });
}

export async function updateMentorAvailability(
  uid: string,
  available: boolean,
  eventAreas: string[],
): Promise<void> {
  await setDoc(
    doc(db, "users", uid),
    {
      alumniMentorAvailable: available,
      mentorEventAreas: eventAreas,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function sendMentorRequest(
  mentorUid: string,
  requester: UserProfile,
  message: string,
  eventAreas: string[],
): Promise<void> {
  const ref = doc(collection(db, "mentorRequests"));
  await setDoc(ref, {
    mentorUid,
    requesterUid: requester.uid,
    requesterName: requester.displayName,
    requesterSchool: requester.schoolName,
    eventAreas,
    message: message.trim(),
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
