import { signInAnonymously } from "firebase/auth";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";

import { auth, db } from "../config/firebase";
import { FeedItem, HomeFeedResponse } from "../types/feed";

const fallbackFeed: FeedItem[] = [
  {
    id: "fallback-1",
    title: "Welcome to FBLA Atlas",
    body: "Your chapter home base for competition prep, practice sessions, and member connection. Complete your profile to get started.",
    author: "FBLA Atlas Team",
    createdAt: new Date().toISOString(),
  },
  {
    id: "fallback-2",
    title: "DLC Registration Closing Soon",
    body: "Submit your District Leadership Conference event registration by Friday. Check with your chapter adviser for the sign-up form.",
    author: "Chapter Officers",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: "fallback-3",
    title: "Mock Interview Workshop This Tuesday",
    body: "Practice professional interviews with local business volunteers in the Career Center at 3:30 PM. Business professional dress required.",
    author: "Career Center",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "fallback-4",
    title: "New Practice Tests Available",
    body: "200+ updated objective test questions aligned with this year's FBLA topics. Head to the Practice section to start a timed session.",
    author: "FBLA Atlas Team",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
  },
  {
    id: "fallback-5",
    title: "Chapter Fundraiser Raised $340",
    body: "Thank you to everyone who supported the bake sale! Proceeds cover SLC registration fees for five members.",
    author: "Chapter Treasurer",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: "fallback-6",
    title: "Presentation Skills Bootcamp Saturday",
    body: "3-hour intensive on slide design, storytelling, and judge Q&A. Bring your laptop. Computer Lab, Room 310 at 10 AM.",
    author: "Competition Team",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
];

type FirestoreFeedDoc = {
  title?: string;
  body?: string;
  author?: string;
  createdAt?: { toDate?: () => Date } | string;
};

function toIsoDate(value: FirestoreFeedDoc["createdAt"]): string {
  if (value && typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return new Date().toISOString();
}

export async function getHomeFeed(): Promise<HomeFeedResponse> {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    const feedQuery = query(
      collection(db, "homeFeed"),
      orderBy("createdAt", "desc"),
      limit(10),
    );

    const snapshot = await getDocs(feedQuery);

    if (snapshot.empty) {
      return { items: fallbackFeed, source: "fallback" };
    }

    const items: FeedItem[] = snapshot.docs.map((doc) => {
      const data = doc.data() as FirestoreFeedDoc;
      return {
        id: doc.id,
        title: data.title || "Untitled Update",
        body: data.body || "No details provided.",
        author: data.author || "FBLA Atlas Team",
        createdAt: toIsoDate(data.createdAt),
      };
    });

    return { items, source: "firestore" };
  } catch (error) {
    console.warn("Using fallback feed because Firestore is unavailable:", error);
    return { items: fallbackFeed, source: "fallback" };
  }
}

