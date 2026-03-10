import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { FblaFact, SocialFeedItem, SocialFeedPlatform } from "../types/social";
import { toIso } from "./firestoreUtils";

export const SOCIAL_PLATFORM_META: Record<
  SocialFeedPlatform,
  {
    name: string;
    color: string;
    handle: string;
    followUrl: string;
    description: string;
  }
> = {
  x: {
    name: "X",
    color: "#000000",
    handle: "@FBLA_National",
    followUrl: "https://twitter.com/FBLA_National",
    description: "Competition updates, chapter highlights, and national announcements.",
  },
  instagram: {
    name: "Instagram",
    color: "#C13584",
    handle: "@fbla_pbl",
    followUrl: "https://www.instagram.com/fbla_pbl",
    description: "Member spotlights, event recaps, and conference moments.",
  },
  facebook: {
    name: "Facebook",
    color: "#1877F2",
    handle: "FBLA National",
    followUrl: "https://www.facebook.com/FBLAnational",
    description: "Official chapter updates and FBLA-PBL community announcements.",
  },
  youtube: {
    name: "YouTube",
    color: "#FF0000",
    handle: "@FBLANational",
    followUrl: "https://www.youtube.com/@FBLANational",
    description: "Session recordings, keynote highlights, and training content.",
  },
  tiktok: {
    name: "TikTok",
    color: "#EE1D52",
    handle: "@fbla_pbl",
    followUrl: "https://www.tiktok.com/@fbla_pbl",
    description: "Quick tips, event snippets, and FBLA culture moments.",
  },
};

const DEFAULT_FACTS: string[] = [
  "NLC 2026 is in Atlanta, GA - June 24-27.",
  "FBLA serves over 230,000 members across the nation.",
  "Business Law, Public Speaking, and Entrepreneurship are top event choices.",
  "Strong opening statements can lift presentation rubric scores quickly.",
  "Consistent weekly practice beats last-minute cramming before conference day.",
  "Using rubric language in your answers helps judges score your work faster.",
];

const DEFAULT_SOCIAL_PREVIEWS: Record<SocialFeedPlatform, string> = {
  x: "Follow for competition deadlines and national FBLA reminders.",
  instagram: "Check the latest photos from chapter and conference activities.",
  facebook: "Read official updates and policy or program announcements.",
  youtube: "Watch highlights and training clips from national sessions.",
  tiktok: "Quick FBLA tips, event recaps, and motivation posts.",
};

export async function fetchSocialFeedCards(): Promise<SocialFeedItem[]> {
  const snap = await getDocs(collection(db, "socialFeed"));
  const map = new Map<SocialFeedPlatform, SocialFeedItem>();

  snap.forEach((row) => {
    const id = row.id as SocialFeedPlatform;
    if (!Object.keys(SOCIAL_PLATFORM_META).includes(id)) {
      return;
    }
    const data = row.data() as Record<string, unknown>;
    map.set(id, {
      platform: id,
      handle:
        typeof data.handle === "string" && data.handle.trim().length > 0
          ? data.handle.trim()
          : SOCIAL_PLATFORM_META[id].handle,
      postText:
        typeof data.postText === "string" && data.postText.trim().length > 0
          ? data.postText.trim()
          : DEFAULT_SOCIAL_PREVIEWS[id],
      postDate: toIso(data.postDate ?? data.updatedAt),
      postUrl:
        typeof data.postUrl === "string" && data.postUrl.trim().length > 0
          ? data.postUrl.trim()
          : SOCIAL_PLATFORM_META[id].followUrl,
    });
  });

  return (Object.keys(SOCIAL_PLATFORM_META) as SocialFeedPlatform[]).map((platform) => {
    const existing = map.get(platform);
    if (existing) {
      return existing;
    }
    return {
      platform,
      handle: SOCIAL_PLATFORM_META[platform].handle,
      postText: DEFAULT_SOCIAL_PREVIEWS[platform],
      postDate: "",
      postUrl: SOCIAL_PLATFORM_META[platform].followUrl,
    };
  });
}

export async function upsertSocialFeedPost(
  platform: SocialFeedPlatform,
  postText: string,
  postUrl: string,
  createdBy: string,
): Promise<void> {
  const base = SOCIAL_PLATFORM_META[platform];
  await setDoc(
    doc(db, "socialFeed", platform),
    {
      platform,
      handle: base.handle,
      postText: postText.trim(),
      postUrl: postUrl.trim() || base.followUrl,
      createdBy,
      postDate: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function fetchFactsForToday(count = 3): Promise<FblaFact[]> {
  let facts: FblaFact[] = [];
  try {
    const snap = await getDocs(
      query(collection(db, "fblaFacts"), orderBy("createdAt", "desc"), limit(60)),
    );
    facts = snap.docs
      .map((row) => {
        const data = row.data() as Record<string, unknown>;
        const text = typeof data.text === "string" ? data.text.trim() : "";
        if (!text) {
          return null;
        }
        return { id: row.id, text };
      })
      .filter((item): item is FblaFact => Boolean(item));
  } catch (error) {
    console.warn("Failed to fetch fblaFacts:", error);
  }

  if (facts.length === 0) {
    facts = DEFAULT_FACTS.map((text, index) => ({ id: `fallback_${index}`, text }));
  }

  const today = new Date().toISOString().slice(0, 10);
  const seed = today.split("-").reduce((sum, part) => sum + Number(part), 0);
  const sorted = [...facts].sort((a, b) => {
    const aScore = (seed + a.id.length * 17) % 97;
    const bScore = (seed + b.id.length * 17) % 97;
    return aScore - bScore;
  });
  return sorted.slice(0, Math.max(1, count));
}

