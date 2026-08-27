import { NextRequest, NextResponse } from "next/server";
import { SID_COOKIE } from "@/lib/longbridge/constants";
import { getClient } from "@/lib/longbridge/store";
import { deleteSession } from "@/lib/longbridge/store";
import { revokeToken } from "@/lib/longbridge/oauth";
import { dropQuoteClient } from "@/lib/longbridge/quote-ws";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sid = req.cookies.get(SID_COOKIE)?.value;
  if (sid) {
    const prev = await deleteSession(sid);
    const client = await getClient();
    if (prev?.refreshToken && client) {
      await revokeToken({ clientId: client.clientId, token: prev.refreshToken });
    }
  }
  dropQuoteClient();
  const res = NextResponse.json({ connected: false });
  res.cookies.delete(SID_COOKIE);
  return res;
}
