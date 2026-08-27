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
import { putPending } from "@/lib/longbridge/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const origin = publicOriginFromHeaders(req.headers);
    const redirectUri = callbackUri(origin);
    const returnTo = safeReturnTo(req.nextUrl.searchParams.get("returnTo"));
    const client = await ensurePublicClient(redirectUri);
    const { verifier, challenge } = createPkce();
    const state = randomState();
    await putPending(state, {
      verifier,
      redirectUri,
      returnTo,
      createdAt: Date.now(),
    });
    const authorize = authorizeUrl({
      clientId: client.clientId,
      redirectUri,
      state,
      challenge,
    });
    const res = NextResponse.redirect(authorize);
    res.cookies.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: origin.startsWith("https"),
      maxAge: 15 * 60,
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "連接 Longbridge 失敗";
    const origin = publicOriginFromHeaders(req.headers);
    const dest = new URL("/", origin);
    dest.searchParams.set("lb", "error");
    dest.searchParams.set("msg", message);
    return NextResponse.redirect(dest);
  }
}
