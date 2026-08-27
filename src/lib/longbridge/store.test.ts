import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getSession,
  longbridgeDataDirCandidates,
  resetLongbridgeStoreForTests,
  resolveLongbridgeDataDir,
  saveSession,
  type TokenRecord,
} from "./store";

const ENV_KEYS = [
  "LONGBRIDGE_DATA_DIR",
  "VERCEL",
  "AWS_LAMBDA_FUNCTION_NAME",
  "LAMBDA_TASK_ROOT",
] as const;

const tokens: TokenRecord = {
  accessToken: "access",
  refreshToken: "refresh",
  accessExpiresAt: Date.now() + 60_000,
  scope: "4 6",
  updatedAt: Date.now(),
};

describe("longbridge store paths", () => {
  const prev: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      prev[key] = process.env[key];
      delete process.env[key];
    }
    resetLongbridgeStoreForTests();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (prev[key] === undefined) delete process.env[key];
      else process.env[key] = prev[key];
    }
    resetLongbridgeStoreForTests();
  });

  it("uses cwd .data locally", () => {
    expect(resolveLongbridgeDataDir()).toBe(join(process.cwd(), ".data", "longbridge"));
  });

  it("uses /tmp on Vercel instead of /var/task", () => {
    process.env.VERCEL = "1";
    expect(resolveLongbridgeDataDir()).toBe(join(tmpdir(), "longbridge"));
    expect(longbridgeDataDirCandidates()).not.toContain(join("/var/task", ".data", "longbridge"));
  });

  it("honors LONGBRIDGE_DATA_DIR", () => {
    process.env.LONGBRIDGE_DATA_DIR = "/custom/lb";
    process.env.VERCEL = "1";
    expect(resolveLongbridgeDataDir()).toBe("/custom/lb");
    expect(longbridgeDataDirCandidates()).toEqual(["/custom/lb"]);
  });

  it("does not write on getSession", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lb-read-"));
    process.env.LONGBRIDGE_DATA_DIR = dir;
    expect(await getSession("missing")).toBeNull();
    expect(existsSync(join(dir, "store.json"))).toBe(false);
    expect(readdirSync(dir)).toEqual([]);
  });

  it("persists sessions when the data dir is writable", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lb-write-"));
    process.env.LONGBRIDGE_DATA_DIR = dir;
    await saveSession("sid-1", tokens);
    expect(existsSync(join(dir, "store.json"))).toBe(true);
    resetLongbridgeStoreForTests();
    expect(await getSession("sid-1")).toEqual(tokens);
  });

  it("keeps reads and writes in memory when mkdir cannot succeed", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lb-blocked-"));
    const blocker = join(dir, "not-a-dir");
    writeFileSync(blocker, "x");
    process.env.LONGBRIDGE_DATA_DIR = join(blocker, "longbridge");
    await expect(saveSession("sid-2", tokens)).resolves.toBeUndefined();
    await expect(getSession("sid-2")).resolves.toEqual(tokens);
  });
});
