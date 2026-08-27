import "server-only";

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const DATA_DIR = process.env.LONGBRIDGE_DATA_DIR || join(process.cwd(), ".data", "longbridge");

export type OAuthClientRecord = {
  clientId: string;
  redirectUris: string[];
  registeredAt: number;
};

export type TokenRecord = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  scope: string;
  updatedAt: number;
};

export type PendingAuth = {
  verifier: string;
  redirectUri: string;
  returnTo: string;
  createdAt: number;
};

type StoreFile = {
  client: OAuthClientRecord | null;
  sessions: Record<string, TokenRecord>;
  pending: Record<string, PendingAuth>;
};

function storePath(): string {
  return join(DATA_DIR, "store.json");
}

function emptyStore(): StoreFile {
  return { client: null, sessions: {}, pending: {} };
}

let cache: StoreFile | null = null;
let writeChain: Promise<void> = Promise.resolve();

function load(): StoreFile {
  if (cache) return cache;
  try {
    const raw = readFileSync(storePath(), "utf8");
    cache = JSON.parse(raw) as StoreFile;
    cache.sessions ??= {};
    cache.pending ??= {};
    return cache;
  } catch {
    cache = emptyStore();
    return cache;
  }
}

function persist(next: StoreFile): void {
  cache = next;
  mkdirSync(dirname(storePath()), { recursive: true, mode: 0o700 });
  const tmp = `${storePath()}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
  renameSync(tmp, storePath());
}

function mutate<T>(fn: (store: StoreFile) => T): T {
  const store = load();
  const result = fn(store);
  persist(store);
  return result;
}

export function withStore<T>(fn: (store: StoreFile) => T): Promise<T> {
  const run = writeChain.then(() => mutate(fn));
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function getClient(): Promise<OAuthClientRecord | null> {
  return withStore((s) => s.client);
}

export async function saveClient(client: OAuthClientRecord): Promise<void> {
  await withStore((s) => {
    s.client = client;
  });
}

export async function getSession(sid: string): Promise<TokenRecord | null> {
  if (!sid) return null;
  return withStore((s) => s.sessions[sid] ?? null);
}

export async function saveSession(sid: string, tokens: TokenRecord): Promise<void> {
  await withStore((s) => {
    s.sessions[sid] = tokens;
  });
}

export async function deleteSession(sid: string): Promise<TokenRecord | null> {
  return withStore((s) => {
    const prev = s.sessions[sid] ?? null;
    delete s.sessions[sid];
    return prev;
  });
}

export async function putPending(state: string, pending: PendingAuth): Promise<void> {
  await withStore((s) => {
    const now = Date.now();
    for (const [k, v] of Object.entries(s.pending)) {
      if (now - v.createdAt > 15 * 60 * 1000) delete s.pending[k];
    }
    s.pending[state] = pending;
  });
}

export async function takePending(state: string): Promise<PendingAuth | null> {
  return withStore((s) => {
    const p = s.pending[state] ?? null;
    delete s.pending[state];
    return p;
  });
}
