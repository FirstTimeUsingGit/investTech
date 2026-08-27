import { describe, expect, it } from "vitest";
import { parseOAuthPending, serializeOAuthPending } from "./oauth-pending";

const payload = {
  state: "st",
  verifier: "verifier-value",
  redirectUri: "https://example.com/api/longbridge/callback",
  returnTo: "/stock/AAPL",
  createdAt: Date.now(),
  clientId: "client-1",
};

describe("oauth pending cookie", () => {
  it("round-trips the handshake payload", () => {
    const raw = serializeOAuthPending(payload);
    expect(parseOAuthPending(raw)).toEqual(payload);
  });

  it("returns null for the legacy raw state cookie", () => {
    expect(parseOAuthPending("plain-state")).toBeNull();
  });

  it("returns null when expired", () => {
    const raw = serializeOAuthPending({
      ...payload,
      createdAt: Date.now() - 16 * 60 * 1000,
    });
    expect(parseOAuthPending(raw)).toBeNull();
  });
});
