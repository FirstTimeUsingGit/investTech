import { NextRequest, NextResponse } from "next/server";
import { searchYahoo } from "@/lib/yahoo";
import { normalizeTicker } from "@/lib/ticker";
import { friendlyName } from "@/lib/names";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  try {
    const hits = await searchYahoo(q);
    if (hits.length === 0) {
      const parsed = normalizeTicker(q);
      if ("symbol" in parsed) {
        return NextResponse.json({
          hits: [
            {
              symbol: parsed.symbol,
              name: friendlyName(parsed.symbol),
              nameEn: parsed.symbol,
              exchange: parsed.market === "HK" ? "香港" : "美國",
              market: parsed.market,
            },
          ],
        });
      }
    }
    return NextResponse.json({ hits });
  } catch {
    const parsed = normalizeTicker(q);
    if ("symbol" in parsed) {
      return NextResponse.json({
        hits: [
          {
            symbol: parsed.symbol,
            name: friendlyName(parsed.symbol),
            nameEn: parsed.symbol,
            exchange: parsed.market === "HK" ? "香港" : "美國",
            market: parsed.market,
          },
        ],
      });
    }
    return NextResponse.json({ hits: [], error: "搜尋暫時唔得，直接輸入代號再試。" });
  }
}
