import { NextRequest, NextResponse } from "next/server";
import { normalizeTicker } from "@/lib/ticker";

export const dynamic = "force-dynamic";

function requestOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || req.headers.get("host") || "127.0.0.1:3847";
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto =
    forwardedProto ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const parsed = normalizeTicker(q);
  const origin = requestOrigin(req);
  if ("error" in parsed) {
    const dest = new URL("/", origin);
    dest.searchParams.set("q", q);
    return NextResponse.redirect(dest);
  }
  return NextResponse.redirect(new URL(`/stock/${encodeURIComponent(parsed.symbol)}`, origin));
}
