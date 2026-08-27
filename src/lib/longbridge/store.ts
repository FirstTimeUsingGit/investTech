import "server-only";

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

let cache: StoreFile | null = null;
let writeChain: Promise<void> = Promise.resolve();
let persistWarned = false;

function emptyStore(): StoreFile {
  return { client: null, sessions: {}, pending: {} };
}

export function isServerlessReadOnlyCwd(): boolean {
  if (process.env.VERCEL) return true;
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return true;
  if (process.env.LAMBDA_TASK_ROOT) return true;
  const cwd = process.cwd();
  return cwd === "/var/task" || cwd.startsWith("/var/task/");
}

export function longbridgeDataDirCandidates(): string[] {
  const env = process.env.LONGBRIDGE_DATA_DIR?.trim();
  if (env) return [env];
  const tmpDir = join(tmpdir(), "longbridge");
  if (isServerlessReadOnlyCwd()) return [tmpDir];
  const localDir = join(process.cwd(), ".data", "longbridge");
  return localDir === tmpDir ? [localDir] : [localDir, tmpDir];
}

export function resolveLongbridgeDataDir(): string {
  return longbridgeDataDirCandidates()[0]!;
}

function storePathFor(dir: string): string {
  return join(dir, "store.json");
}

function load(): StoreFile {
  if (cache) return cache;
  for (const dir of longbridgeDataDirCandidates()) {
    try {
      const raw = readFileSync(storePathFor(dir), "utf8");
      const parsed = JSON.parse(raw) as StoreFile;
      parsed.sessions ??= {};
      parsed.pending ??= {};
      cache = parsed;
      return cache;
    } catch {
      // missing or unreadable — try the next candidate
    }
  }
  cache = emptyStore();
  return cache;
}

function persist(next: StoreFile): void {
  cache = next;
  const payload = JSON.stringify(next, null, 2);
  const dirs = longbridgeDataDirCandidates();
  for (const dir of dirs) {
    try {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      const dest = storePathFor(dir);
      const tmp = `${dest}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
      writeFileSync(tmp, payload, { mode: 0o600 });
      renameSync(tmp, dest);
      return;
    } catch (err) {
      if (!persistWarned) {
        persistWarned = true;
        const message = err instanceof Error ? err.message : String(err);
        console.warn(
          `[longbridge] store persist skipped (${dir}): ${message}. Using in-memory store.`,
        );
      }
    }
  }
}

function enqueue<T>(fn: () => T): Promise<T> {
  const run = writeChain.then(fn);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function readStore<T>(fn: (store: StoreFile) => T): Promise<T> {
  return enqueue(() => fn(load()));
}

function writeStore<T>(fn: (store: StoreFile) => T): Promise<T> {
  return enqueue(() => {
    const store = load();
    const result = fn(store);
    persist(store);
    return result;
  });
}

export function resetLongbridgeStoreForTests(): void {
  cache = null;
  persistWarned = false;
  writeChain = Promise.resolve();
}

export async function getClient(): Promise<OAuthClientRecord | null> {
  return readStore((s) => s.client);
}

export async function saveClient(client: OAuthClientRecord): Promise<void> {
  await writeStore((s) => {
    s.client = client;
  });
}

export async function getSession(sid: string): Promise<TokenRecord | null> {
  if (!sid) return null;
  return readStore((s) => s.sessions[sid] ?? null);
}

export async function saveSession(sid: string, tokens: TokenRecord): Promise<void> {
  await writeStore((s) => {
    s.sessions[sid] = tokens;
  });
}

export async function deleteSession(sid: string): Promise<TokenRecord | null> {
  return writeStore((s) => {
    const prev = s.sessions[sid] ?? null;
    delete s.sessions[sid];
    return prev;
  });
}

export async function putPending(state: string, pending: PendingAuth): Promise<void> {
  await writeStore((s) => {
    const now = Date.now();
    for (const [k, v] of Object.entries(s.pending)) {
      if (now - v.createdAt > 15 * 60 * 1000) delete s.pending[k];
    }
    s.pending[state] = pending;
  });
}

export async function takePending(state: string): Promise<PendingAuth | null> {
  return writeStore((s) => {
    const p = s.pending[state] ?? null;
    delete s.pending[state];
    return p;
  });
}
