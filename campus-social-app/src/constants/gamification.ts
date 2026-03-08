import { PointAction, TierDefinition } from "../types/social";
import { TIER_COLORS } from "./themes";

export const POINT_VALUES: Record<PointAction, number> = {
  posting: 10,
  commenting: 5,
  attending_event: 25,
  likes_received: 2,
  daily_login: 15,
  messaging_new: 5,
  following_user: 5,
};

export const TIERS: TierDefinition[] = [
  { name: "Bronze", minXp: 0, maxXp: 500, color: TIER_COLORS.Bronze },
  { name: "Silver", minXp: 500, maxXp: 1500, color: TIER_COLORS.Silver },
  { name: "Gold", minXp: 1500, maxXp: 3500, color: TIER_COLORS.Gold },
  { name: "Platinum", minXp: 3500, maxXp: 7000, color: TIER_COLORS.Platinum },
  { name: "Diamond", minXp: 7000, maxXp: 12000, color: TIER_COLORS.Diamond },
  { name: "Legend", minXp: 12000, maxXp: null, color: TIER_COLORS.Legend },
];

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
  const span = next.minXp - current.minXp;
  if (span <= 0) {
    return { progress: 1, current, next };
  }
  const progress = (xp - current.minXp) / span;
  return { progress: Math.max(0, Math.min(1, progress)), current, next };
}
