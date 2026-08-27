import { cutoffIndex, sliceOnOrBefore } from "@/lib/indicators";
import { buildPlan } from "@/lib/plan";
import { todayHk } from "@/lib/format";
import { normalizeTicker } from "@/lib/ticker";
import { loadQuoteAndBars } from "@/lib/yahoo";
import { getValidAccessToken } from "@/lib/longbridge/http";
import { loadLongbridgeQuoteAndBars } from "@/lib/longbridge/quotes";
import { readSessionId } from "@/lib/longbridge/session";
import type { StockPayload } from "@/lib/types";

export async function getStockPayload(
  rawTicker: string,
  asOf?: string | null,
  sessionId?: string | null,
): Promise<StockPayload> {
  const parsed = normalizeTicker(rawTicker);
  if ("error" in parsed) {
    throw Object.assign(new Error(parsed.error), { status: 400 });
  }
  const sid = sessionId === undefined ? await readSessionId() : sessionId;
  const { quote, bars } = await loadPreferredQuoteAndBars(parsed.symbol, sid);
  const asOfDate = asOf && /^\d{4}-\d{2}-\d{2}$/.test(asOf) ? asOf : todayHk();
  const sliced = sliceOnOrBefore(bars, asOfDate);
  if (sliced.length < 40) {
    throw Object.assign(new Error("呢個日期之前嘅歷史不夠，試下揀遲啲嘅日子。"), { status: 400 });
  }
  const analysis = buildPlan(sliced);
  return {
    quote,
    bars,
    analysis,
    asOf: sliced[sliced.length - 1].date,
    cutoffIndex: cutoffIndex(bars, asOfDate),
  };
}

async function loadPreferredQuoteAndBars(symbol: string, sessionId?: string | null) {
  if (sessionId) {
    const creds = await getValidAccessToken(sessionId);
    if (creds) {
      try {
        return await loadLongbridgeQuoteAndBars(symbol, creds.accessToken, creds.clientId);
      } catch (err) {
        console.warn("[longbridge] falling back to Yahoo:", err instanceof Error ? err.message : err);
      }
    }
  }
  return loadQuoteAndBars(symbol);
}
