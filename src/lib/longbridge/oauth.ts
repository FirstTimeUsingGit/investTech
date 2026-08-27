import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { CALLBACK_PATH, HTTP_BASE, QUOTE_SCOPES } from "./constants";
import { getClient, saveClient, type OAuthClientRecord } from "./store";

const TOKEN_URL = `${HTTP_BASE}/oauth2/token`;
const REGISTER_URL = `${HTTP_BASE}/oauth2/register`;
const AUTHORIZE_URL = `${HTTP_BASE}/oauth2/authorize`;
const REVOKE_URL = `${HTTP_BASE}/oauth2/revoke`;

export function base64Url(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function createPkce(): { verifier: string; challenge: string } {
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function randomState(): string {
  return base64Url(randomBytes(16));
}

export function publicOriginFromHeaders(headers: Headers): string {
  const envOrigin = process.env.LONGBRIDGE_PUBLIC_ORIGIN?.replace(/\/$/, "");
  if (envOrigin) return envOrigin;
  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || headers.get("host") || "127.0.0.1:3847";
  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto =
    forwardedProto ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

export function callbackUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}${CALLBACK_PATH}`;
}

export async function ensurePublicClient(redirectUri: string): Promise<OAuthClientRecord> {
  const existing = await getClient();
  if (existing && existing.redirectUris.includes(redirectUri) && existing.clientId) {
    return existing;
  }
  const res = await fetch(REGISTER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_name: "三個價",
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      application_type: "web",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => null)) as
    | { client_id?: string; error?: string; error_description?: string }
    | null;
  if (!res.ok || !json?.client_id) {
    const detail = json?.error_description || json?.error || `HTTP ${res.status}`;
    throw new Error(`Longbridge 客戶端登記失敗：${detail}`);
  }
  const record: OAuthClientRecord = {
    clientId: json.client_id,
    redirectUris: [redirectUri],
    registeredAt: Date.now(),
  };
  await saveClient(record);
  return record;
}

export function authorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
}): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    scope: QUOTE_SCOPES.join(" "),
    state: opts.state,
    code_challenge: opts.challenge,
    code_challenge_method: "S256",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export type TokenSet = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
};

function parseTokenResponse(json: Record<string, unknown>): TokenSet {
  const accessToken = typeof json.access_token === "string" ? json.access_token : "";
  const refreshToken = typeof json.refresh_token === "string" ? json.refresh_token : "";
  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : Number(json.expires_in) || 3600;
  const scope = typeof json.scope === "string" ? json.scope : QUOTE_SCOPES.join(" ");
  if (!accessToken || !refreshToken) {
    const desc = typeof json.error_description === "string" ? json.error_description : "token response incomplete";
    throw new Error(desc);
  }
  return { accessToken, refreshToken, expiresIn, scope };
}

export async function exchangeCode(opts: {
  clientId: string;
  redirectUri: string;
  code: string;
  verifier: string;
}): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    code: opts.code,
    code_verifier: opts.verifier,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const desc = typeof json.error_description === "string" ? json.error_description : `HTTP ${res.status}`;
    throw new Error(desc);
  }
  return parseTokenResponse(json);
}

export async function refreshTokens(opts: { clientId: string; refreshToken: string }): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: opts.clientId,
    refresh_token: opts.refreshToken,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const desc = typeof json.error_description === "string" ? json.error_description : `HTTP ${res.status}`;
    throw new Error(desc);
  }
  return parseTokenResponse(json);
}

export async function revokeToken(opts: { clientId: string; token: string }): Promise<void> {
  try {
    const body = new URLSearchParams({
      token: opts.token,
      token_type_hint: "refresh_token",
      client_id: opts.clientId,
    });
    await fetch(REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    // best-effort
  }
}

export function safeReturnTo(raw: string | null | undefined): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  if (raw.includes("://")) return "/";
  return raw;
}
