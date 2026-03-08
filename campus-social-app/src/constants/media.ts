export const DEFAULT_IMAGE_BLURHASH = "L6Pj0^i_.AyE_3t7t7R**0o#DgR4";

export const CAMPUS_IMAGES = [
  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1562774053-701939374585?w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1600&auto=format&fit=crop",
] as const;

export const EVENT_IMAGES = [
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1600&auto=format&fit=crop",
] as const;

export const SPORTS_IMAGES = [
  "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1600&auto=format&fit=crop",
] as const;

export const SOCIAL_IMAGES = [
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1600&auto=format&fit=crop",
] as const;

export const FBLA_IMAGES = [
  "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&auto=format&fit=crop",
] as const;

export const SOCIAL_WIDGET_IMAGES = {
  instagram: SOCIAL_IMAGES[0],
  x: SOCIAL_IMAGES[1],
  tiktok: SOCIAL_IMAGES[2],
  youtube: EVENT_IMAGES[1],
  snapchat: SOCIAL_IMAGES[3],
} as const;

function hashSeed(seed: string): number {
  return seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function pickFromPool(pool: readonly string[], seed: string): string {
  return pool[hashSeed(seed) % pool.length];
}

export function getCampusImage(seed: string): string {
  return pickFromPool(CAMPUS_IMAGES, seed);
}

export function getEventImage(seed: string): string {
  return pickFromPool(EVENT_IMAGES, seed);
}

export function getSportsImage(seed: string): string {
  return pickFromPool(SPORTS_IMAGES, seed);
}

export function getSocialImage(seed: string): string {
  return pickFromPool(SOCIAL_IMAGES, seed);
}

export function getBusinessImage(seed: string): string {
  return pickFromPool(FBLA_IMAGES, seed);
}

export function getEventImageByCategory(category: string | null | undefined, seed: string): string {
  const normalized = category?.toLowerCase() ?? "";
  if (normalized.includes("sport")) {
    return getSportsImage(seed);
  }
  if (normalized.includes("fbla") || normalized.includes("business") || normalized.includes("academic")) {
    return getBusinessImage(seed);
  }
  if (normalized.includes("social")) {
    return getSocialImage(seed);
  }
  if (normalized.includes("arts")) {
    return getCampusImage(seed);
  }
  return getEventImage(seed);
}

export function getClubImageByCategory(name: string, description: string): string {
  const normalized = `${name} ${description}`.toLowerCase();
  if (normalized.includes("sport")) {
    return getSportsImage(name);
  }
  if (normalized.includes("fbla") || normalized.includes("business") || normalized.includes("deca")) {
    return getBusinessImage(name);
  }
  if (normalized.includes("art") || normalized.includes("music") || normalized.includes("creative")) {
    return getCampusImage(name);
  }
  if (normalized.includes("academic") || normalized.includes("study") || normalized.includes("coding")) {
    return getCampusImage(description || name);
  }
  return getSocialImage(name);
}

export function getNewsBannerImage(seed: string): string {
  return getCampusImage(seed);
}

export function getUserAvatarUrl(seed: string): string {
  return getUserAvatarFallbackUrl(seed);
}

export function getUserAvatarFallbackUrl(name: string): string {
  const cleaned = name.trim() || "student";
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleaned)}&backgroundColor=2A2A2A&textColor=FFFFFF&fontFamily=Arial`;
}

function isLegacyGeneratedAvatar(url: string): boolean {
  return /api\.dicebear\.com\/7\.x\/(avataaars|lorelei)\//i.test(url);
}

export function resolveAvatarUrl(preferredUrl: string | null | undefined, seed: string): string {
  if (preferredUrl && preferredUrl.trim().length > 0 && !isLegacyGeneratedAvatar(preferredUrl)) {
    return preferredUrl.trim();
  }
  return getUserAvatarFallbackUrl(seed);
}
