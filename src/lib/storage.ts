import type { ReplayOutcome } from "./types";

const WATCH_KEY = "saamgaa-watchlist";
const REPLAY_KEY = "saamgaa-replays";

export type WatchItem = {
  symbol: string;
  name: string;
  addedAt: string;
};

export type SavedReplay = {
  id: string;
  symbol: string;
  name: string;
  asOf: string;
  savedAt: string;
  outcome?: ReplayOutcome;
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getWatchlist(): WatchItem[] {
  return readJson<WatchItem[]>(WATCH_KEY, []);
}

export function toggleWatch(item: WatchItem): WatchItem[] {
  const list = getWatchlist();
  const exists = list.some((x) => x.symbol === item.symbol);
  const next = exists
    ? list.filter((x) => x.symbol !== item.symbol)
    : [{ ...item, addedAt: new Date().toISOString() }, ...list].slice(0, 24);
  writeJson(WATCH_KEY, next);
  return next;
}

export function isWatched(symbol: string): boolean {
  return getWatchlist().some((x) => x.symbol === symbol);
}

export function getReplays(): SavedReplay[] {
  return readJson<SavedReplay[]>(REPLAY_KEY, []);
}

export function saveReplay(session: SavedReplay): SavedReplay[] {
  const list = getReplays().filter(
    (x) => !(x.symbol === session.symbol && x.asOf === session.asOf),
  );
  const next = [session, ...list].slice(0, 12);
  writeJson(REPLAY_KEY, next);
  return next;
}

export function updateReplayOutcome(id: string, outcome: ReplayOutcome): SavedReplay[] {
  const next = getReplays().map((x) => (x.id === id ? { ...x, outcome } : x));
  writeJson(REPLAY_KEY, next);
  return next;
}
