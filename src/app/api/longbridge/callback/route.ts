import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE, SID_COOKIE } from "@/lib/longbridge/constants";
import { exchangeCode, publicOriginFromHeaders, safeReturnTo } from "@/lib/longbridge/oauth";
import { parseOAuthPending } from "@/lib/longbridge/oauth-pending";
import { getClient, saveClient, saveSession, takePending } from "@/lib/longbridge/store";

export const dynamic = "force-dynamic";

function sid(): string {
  return randomBytes(24).toString("hex");
}

export async function GET(req: NextRequest) {
  const origin = publicOriginFromHeaders(req.headers);
  const fail = (msg: string, returnTo = "/") => {
    const dest = new URL(safeReturnTo(returnTo), origin);
    dest.searchParams.set("lb", "error");
    dest.searchParams.set("msg", msg);
    const res = NextResponse.redirect(dest);
    res.cookies.delete(OAUTH_STATE_COOKIE);
    return res;
  };

  const error = req.nextUrl.searchParams.get("error");
  const errorDesc = req.nextUrl.searchParams.get("error_description");
  if (error) {
    return fail(errorDesc || "你取消咗授權，繼續用延遲行情。");
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const rawCookie = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const pendingCookie = parseOAuthPending(rawCookie);
  const cookieState = pendingCookie?.state ?? rawCookie;
  if (!code || !state || !cookieState || cookieState !== state) {
    return fail("授權狀態唔啱，請再撳一次連接。");
  }

  let pending = pendingCookie
    ? {
        verifier: pendingCookie.verifier,
        redirectUri: pendingCookie.redirectUri,
        returnTo: pendingCookie.returnTo,
        createdAt: pendingCookie.createdAt,
      }
    : null;
  if (!pending) {
    try {
      pending = await takePending(state);
    } catch {
      pending = null;
    }
  }
  if (!pending) {
    return fail("授權逾時，請再撳一次連接。");
  }

  let client = null;
  try {
    client = await getClient();
  } catch {
    client = null;
  }
  if (!client && pendingCookie?.clientId) {
    client = {
      clientId: pendingCookie.clientId,
      redirectUris: [pendingCookie.redirectUri],
      registeredAt: pendingCookie.createdAt,
    };
    try {
      await saveClient(client);
    } catch {
      // in-memory /tmp persist is best-effort
    }
  }
  if (!client) {
    return fail("未登記 OAuth 客戶端，請再試。", pending.returnTo);
  }

  try {
    const tokens = await exchangeCode({
      clientId: client.clientId,
      redirectUri: pending.redirectUri,
      code,
      verifier: pending.verifier,
    });
    const sessionId = sid();
    try {
      await saveSession(sessionId, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessExpiresAt: Date.now() + tokens.expiresIn * 1000,
        scope: tokens.scope,
        updatedAt: Date.now(),
      });
    } catch {
      return fail("呢個雲端環境唔可以儲存 Longbridge 登入狀態，繼續用延遲行情。", pending.returnTo);
    }
    const dest = new URL(safeReturnTo(pending.returnTo), origin);
    dest.searchParams.set("lb", "connected");
    const res = NextResponse.redirect(dest);
    res.cookies.delete(OAUTH_STATE_COOKIE);
    res.cookies.set(SID_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: origin.startsWith("https"),
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "換 token 失敗";
    return fail(`連接失敗：${message}`, pending.returnTo);
  }
}
