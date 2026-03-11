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
  x: "🏆 NLC 2026 registration is now OPEN! Atlanta, GA — June 24–27. Don't miss your chance to compete on the national stage. Register through your state officer today. #FBLA #NLC2026",
  instagram: "✨ Congratulations to all SLC qualifiers! The energy at state competitions this year has been incredible. Tag your chapter below — we want to celebrate YOU. See you at NLC! 🎉 #FBLAProud #SLC2026",
  facebook: "📢 FBLA National is pleased to announce the 2025–2026 competitive event updates. Several events have revised guidelines this season — download the updated PDFs at fbla.org/compete/events before your next practice session.",
  youtube: "🎬 NEW VIDEO: 'How to Ace Your FBLA Role Play Event' — Our national officers walk through the full 7-minute prep strategy, common judge questions, and how to structure your opening. Watch now on the FBLA National YouTube channel!",
  tiktok: "POV: You just placed at your state conference 😭🏅 The grind was real — 3am study sessions, timed mock presentations, flashcard marathons. Worth every second. Share this with your chapter fam. #FBLA #CompetitionSzn #StateChamps",
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

