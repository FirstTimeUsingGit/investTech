import { NextRequest, NextResponse } from "next/server";
import { getStockPayload } from "@/lib/stock";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker") ?? "";
  const asOf = req.nextUrl.searchParams.get("asOf");
  try {
    const payload = await getStockPayload(ticker, asOf);
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "出咗問題，請稍後再試。";
    const status = typeof err === "object" && err && "status" in err ? Number(err.status) || 500 : 500;
    return NextResponse.json({ error: message }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}
