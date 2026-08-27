export type OAuthPendingPayload = {
  state: string;
  verifier: string;
  redirectUri: string;
  returnTo: string;
  createdAt: number;
  clientId: string;
};

const PENDING_TTL_MS = 15 * 60 * 1000;

export function serializeOAuthPending(payload: OAuthPendingPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function parseOAuthPending(raw: string | undefined | null): OAuthPendingPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<OAuthPendingPayload>;
    if (
      typeof parsed.state !== "string" ||
      !parsed.state ||
      typeof parsed.verifier !== "string" ||
      !parsed.verifier ||
      typeof parsed.redirectUri !== "string" ||
      !parsed.redirectUri ||
      typeof parsed.returnTo !== "string" ||
      typeof parsed.createdAt !== "number" ||
      typeof parsed.clientId !== "string" ||
      !parsed.clientId
    ) {
      return null;
    }
    if (Date.now() - parsed.createdAt > PENDING_TTL_MS) return null;
    return parsed as OAuthPendingPayload;
  } catch {
    return null;
  }
}
