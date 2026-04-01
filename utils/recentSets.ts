const STORAGE_KEY = "recent_set_views_v1";

type SetLike = {
  id: string;
  created_at?: string;
};

type RecentMap = Record<string, number>;

function readRecentMap(): RecentMap {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([id, ts]) => id && typeof ts === "number" && Number.isFinite(ts),
      ),
    );
  } catch {
    return {};
  }
}

function writeRecentMap(map: RecentMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function markSetViewed(setId: string) {
  if (!setId) return;
  const map = readRecentMap();
  map[setId] = Date.now();
  writeRecentMap(map);
}

export function sortSetsByRecentView<T extends SetLike>(sets: T[]): T[] {
  const map = readRecentMap();
  return [...sets].sort((a, b) => {
    const recentDiff = (map[b.id] ?? 0) - (map[a.id] ?? 0);
    if (recentDiff !== 0) return recentDiff;

    const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
    const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
    return createdB - createdA;
  });
}
