import "server-only";

import { HTTP_BASE } from "./constants";
import {
  getClient,
  getSession,
  saveSession,
  type OAuthClientRecord,
  type TokenRecord,
} from "./store";
import { refreshTokens } from "./oauth";

const SKEW_MS = 60_000;

export async function getValidAccessToken(sid: string): Promise<{
  accessToken: string;
  clientId: string;
} | null> {
  let session: TokenRecord | null;
  let client: OAuthClientRecord | null;
  try {
    session = await getSession(sid);
    client = await getClient();
  } catch {
    return null;
  }
  if (!session || !client) return null;
  if (session.accessExpiresAt - SKEW_MS > Date.now() && session.accessToken) {
    return { accessToken: session.accessToken, clientId: client.clientId };
  }
  try {
    const next = await refreshTokens({
      clientId: client.clientId,
      refreshToken: session.refreshToken,
    });
    const record: TokenRecord = {
      accessToken: next.accessToken,
      refreshToken: next.refreshToken || session.refreshToken,
      accessExpiresAt: Date.now() + next.expiresIn * 1000,
      scope: next.scope,
      updatedAt: Date.now(),
    };
    try {
      await saveSession(sid, record);
    } catch {
      // Keep using the refreshed token in-memory even if disk persist fails.
    }
    return { accessToken: record.accessToken, clientId: client.clientId };
  } catch {
    return null;
  }
}

export async function httpGetJson<T>(opts: {
  path: string;
  accessToken: string;
  clientId: string;
}): Promise<T> {
  const res = await fetch(`${HTTP_BASE}${opts.path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "x-api-key": opts.clientId,
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8",
      "accept-language": "zh-HK",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  const json = (await res.json().catch(() => null)) as
    | { code?: number; message?: string; msg?: string; data?: T }
    | null;
  if (!res.ok || !json || (typeof json.code === "number" && json.code !== 0)) {
    const msg = json?.message || json?.msg || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json.data as T;
}

export async function getSocketOtp(accessToken: string, clientId: string): Promise<string> {
  const paths = ["/v2/socket/token", "/v1/socket/token"];
  let last = "無法取得行情連線密碼";
  for (const path of paths) {
    try {
      const data = await httpGetJson<{ otp?: string }>({ path, accessToken, clientId });
      if (data?.otp) return data.otp;
      last = `${path} 沒有 otp`;
    } catch (err) {
      last = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(last);
}
