import { signInAnonymously } from "firebase/auth";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";

import { auth, db } from "../config/firebase";
import { FeedItem, HomeFeedResponse } from "../types/feed";

const fallbackFeed: FeedItem[] = [
  {
    id: "fallback-1",
    title: "Welcome to FBLA Atlas",
    body: "This is your starter FBLA feed card. Replace with real Firestore content anytime.",
    author: "Student Council",
    createdAt: new Date().toISOString(),
  },
  {
    id: "fallback-2",
    title: "Mock Interview Workshop",
    body: "Business club hosts a workshop on Tuesday at 3:30 PM in Room 108.",
    author: "Career Center",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "fallback-3",
    title: "Spring Tech Expo",
    body: "Submit project proposals by Friday to be featured in the school showcase.",
    author: "Technology Club",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
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

