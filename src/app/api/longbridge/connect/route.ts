import { NextRequest, NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE } from "@/lib/longbridge/constants";
import {
  authorizeUrl,
  callbackUri,
  createPkce,
  ensurePublicClient,
  publicOriginFromHeaders,
  randomState,
  safeReturnTo,
} from "@/lib/longbridge/oauth";
import { serializeOAuthPending } from "@/lib/longbridge/oauth-pending";
import { putPending } from "@/lib/longbridge/store";

export const dynamic = "force-dynamic";

function connectErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : "連接 Longbridge 失敗";
  if (/ENOENT|EROFS|EACCES|EPERM|read-only/i.test(raw)) {
    return "呢個雲端環境唔可以儲存 Longbridge 登入狀態，繼續用延遲行情。";
  }
  return raw;
}

export async function GET(req: NextRequest) {
  try {
    const origin = publicOriginFromHeaders(req.headers);
    const redirectUri = callbackUri(origin);
    const returnTo = safeReturnTo(req.nextUrl.searchParams.get("returnTo"));
    const client = await ensurePublicClient(redirectUri);
    const { verifier, challenge } = createPkce();
    const state = randomState();
    const pending = {
      verifier,
      redirectUri,
      returnTo,
      createdAt: Date.now(),
    };
    try {
      await putPending(state, pending);
    } catch {
      // Cookie below is enough for the callback on serverless.
    }
    const authorize = authorizeUrl({
      clientId: client.clientId,
      redirectUri,
      state,
      challenge,
    });
    const res = NextResponse.redirect(authorize);
    res.cookies.set(
      OAUTH_STATE_COOKIE,
      serializeOAuthPending({
        state,
        clientId: client.clientId,
        ...pending,
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: origin.startsWith("https"),
        maxAge: 15 * 60,
      },
    );
    return res;
  } catch (err) {
    const message = connectErrorMessage(err);
    const origin = publicOriginFromHeaders(req.headers);
    const dest = new URL("/", origin);
    dest.searchParams.set("lb", "error");
    dest.searchParams.set("msg", message);
    return NextResponse.redirect(dest);
  }
}
