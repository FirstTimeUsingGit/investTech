import { NextRequest, NextResponse } from "next/server";
import { SID_COOKIE } from "@/lib/longbridge/constants";
import { getSession } from "@/lib/longbridge/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sid = req.cookies.get(SID_COOKIE)?.value;
    if (!sid) return NextResponse.json({ connected: false });
    const session = await getSession(sid);
    return NextResponse.json({ connected: Boolean(session?.refreshToken) });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
