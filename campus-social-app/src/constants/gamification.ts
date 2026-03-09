import { PointAction, TierDefinition } from "../types/social";
import { TIER_COLORS } from "./themes";

export const POINT_VALUES: Record<PointAction, number> = {
  posting: 8,
  commenting: 5,
  attending_event: 8,
  likes_received: 0,
  liking_post: 3,
  daily_login: 10,
  messaging_new: 0,
  following_user: 2,
  complete_practice_test: 15,
  score_90_bonus: 25,
  complete_flashcard_deck: 12,
  complete_presentation: 18,
  complete_mock_judge: 20,
  seven_day_streak_bonus: 40,
  perfect_test_score: 35,
  first_post_bonus: 15,
  profile_completed_bonus: 20,
};

export const TIERS: TierDefinition[] = [
  { name: "Bronze", minXp: 0, maxXp: 51, color: TIER_COLORS.Bronze },
  { name: "Silver", minXp: 51, maxXp: 151, color: TIER_COLORS.Silver },
  { name: "Gold", minXp: 151, maxXp: 351, color: TIER_COLORS.Gold },
  { name: "Platinum", minXp: 351, maxXp: 701, color: TIER_COLORS.Platinum },
  { name: "Diamond", minXp: 701, maxXp: 1201, color: TIER_COLORS.Diamond },
  { name: "Legend", minXp: 1201, maxXp: null, color: TIER_COLORS.Legend },
];

export function getTierColor(tier: string): string {
  if (tier === "Bronze") {
    return TIER_COLORS.Bronze;
  }
  if (tier === "Silver") {
    return TIER_COLORS.Silver;
  }
  if (tier === "Gold") {
    return TIER_COLORS.Gold;
  }
  if (tier === "Platinum") {
    return TIER_COLORS.Platinum;
  }
  if (tier === "Diamond") {
    return TIER_COLORS.Diamond;
  }
  if (tier === "Legend") {
    return TIER_COLORS.Legend;
  }
  return TIER_COLORS.Bronze;
}

export function colorWithAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const normalized =
    clean.length === 3
      ? `${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`
      : clean;
  const num = Number.parseInt(normalized, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}

export function getTierForXp(xp: number): TierDefinition {
  const safeXp = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  for (const tier of TIERS) {
    const withinUpper = tier.maxXp === null || safeXp < tier.maxXp;
    if (safeXp >= tier.minXp && withinUpper) {
      return tier;
    }
  }
  return TIERS[0];
}

export function getNextTier(xp: number): TierDefinition | null {
  const current = getTierForXp(xp);
  const currentIndex = TIERS.findIndex((item) => item.name === current.name);
  if (currentIndex < 0 || currentIndex === TIERS.length - 1) {
    return null;
  }
  return TIERS[currentIndex + 1];
}

export function getXpProgress(xp: number): {
  progress: number;
  current: TierDefinition;
  next: TierDefinition | null;
} {
  const current = getTierForXp(xp);
  const next = getNextTier(xp);
  if (!next) {
    return { progress: 1, current, next: null };
  }
  if (current.maxXp === null) {
    return { progress: 1, current, next };
  }
  const span = Math.max(1, current.maxXp - current.minXp - 1);
  if (span <= 0) {
    return { progress: 1, current, next };
  }
  const progress = (xp - current.minXp) / span;
  return { progress: Math.max(0, Math.min(1, progress)), current, next };
}
