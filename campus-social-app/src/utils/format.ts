export function formatCompactNumber(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  if (safe < 1000) {
    return String(Math.round(safe));
  }
  if (safe < 1_000_000) {
    return `${(safe / 1000).toFixed(safe >= 10_000 ? 0 : 1)}k`;
  }
  return `${(safe / 1_000_000).toFixed(1)}m`;
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const deltaMs = Math.max(0, now - date.getTime());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (deltaMs < minute) {
    return "Just now";
  }
  if (deltaMs < hour) {
    const mins = Math.floor(deltaMs / minute);
    return `${mins}m ago`;
  }
  if (deltaMs < day) {
    const hours = Math.floor(deltaMs / hour);
    return `${hours}h ago`;
  }
  if (deltaMs < 2 * day) {
    return "Yesterday";
  }
  const days = Math.floor(deltaMs / day);
  if (days < 7) {
    return `${days}d ago`;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function getTimeGreeting(name: string): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return `Good morning, ${name}`;
  }
  if (hour < 18) {
    return `Good afternoon, ${name}`;
  }
  return `Good evening, ${name}`;
}

