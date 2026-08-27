import "server-only";

import { unixToDate } from "@/lib/format";
import { friendlyName } from "@/lib/names";
import { inferMarket } from "@/lib/ticker";
import type { Bar, Quote } from "@/lib/types";
import { getSocketOtp } from "./http";
import { QuoteWsClient, withQuoteClient } from "./quote-ws";
import { exchangeTimezone, toLongbridgeSymbol } from "./symbols";
import type { LbCandle, LbStatic } from "./proto";

export async function loadLongbridgeQuoteAndBars(
  yahooSymbol: string,
  accessToken: string,
  clientId: string,
): Promise<{ quote: Quote; bars: Bar[] }> {
  const lbSymbol = toLongbridgeSymbol(yahooSymbol);
  return withQuoteClient(
    accessToken,
    async () => {
      const otp = await getSocketOtp(accessToken, clientId);
      return QuoteWsClient.connect(otp);
    },
    async (client) => {
      const [quotes, statics, candles] = await Promise.all([
        client.quote([lbSymbol]),
        client.staticInfo([lbSymbol]).catch(() => [] as LbStatic[]),
        loadCandles(client, lbSymbol),
      ]);
      const q = quotes[0];
      if (!q || !q.lastDone) {
        throw new Error("Longbridge 冇呢隻即時報價");
      }
      if (candles.length < 40) {
        throw new Error("Longbridge 歷史K線不夠");
      }
      const info = statics[0];
      const market = inferMarket(yahooSymbol);
      const tz = exchangeTimezone(market);
      const bars = candlesToBars(candles, tz);
      const last = bars[bars.length - 1];
      const year = bars.slice(-252);
      const highs = year.map((b) => b.high);
      const lows = year.map((b) => b.low);
      const price = q.lastDone;
      const prev = q.prevClose || (bars.length > 1 ? bars[bars.length - 2].close : null);
      const change = prev != null ? price - prev : null;
      const changePercent = prev ? (change! / prev) * 100 : null;
      const names = pickNames(yahooSymbol, info);
      const pe =
        info?.epsTtm && info.epsTtm !== 0 && Number.isFinite(price / info.epsTtm)
          ? price / info.epsTtm
          : null;
      const marketCap =
        info?.totalShares && info.totalShares > 0 ? info.totalShares * price : null;
      const quote: Quote = {
        symbol: yahooSymbol,
        name: names.name,
        nameEn: names.nameEn,
        currency: info?.currency || (market === "HK" ? "HKD" : "USD"),
        market,
        exchange: info?.exchange || (market === "HK" ? "SEHK" : "US"),
        price,
        previousClose: prev,
        change,
        changePercent,
        dayHigh: q.high || last.high,
        dayLow: q.low || last.low,
        volume: q.volume || last.volume,
        marketCap,
        peTrailing: pe,
        fiftyTwoWeekHigh: highs.length ? Math.max(...highs) : null,
        fiftyTwoWeekLow: lows.length ? Math.min(...lows) : null,
        timezone: tz,
        delayed: false,
        source: "longbridge",
      };
      return { quote, bars };
    },
  );
}

async function loadCandles(client: QuoteWsClient, lbSymbol: string): Promise<LbCandle[]> {
  const recent = await client.candlesticks(lbSymbol, 1000);
  if (recent.length >= 200) return sortCandles(recent);
  try {
    const end = yyyymmdd(new Date());
    const start = yyyymmdd(yearsAgo(5));
    const hist = await client.historyByDate(lbSymbol, start, end);
    return sortCandles(hist.length >= recent.length ? hist : recent);
  } catch {
    return sortCandles(recent);
  }
}

function sortCandles(candles: LbCandle[]): LbCandle[] {
  return [...candles]
    .filter((c) => c.close > 0 && c.timestamp > 0)
    .sort((a, b) => a.timestamp - b.timestamp);
}

function candlesToBars(candles: LbCandle[], tz: string): Bar[] {
  const bars: Bar[] = [];
  const seen = new Set<string>();
  for (const c of candles) {
    const date = unixToDate(c.timestamp, tz);
    if (seen.has(date)) continue;
    seen.add(date);
    bars.push({
      time: c.timestamp,
      date,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    });
  }
  return bars;
}

function pickNames(yahooSymbol: string, info?: LbStatic): { name: string; nameEn: string } {
  const nameEn = info?.nameEn || yahooSymbol;
  const local = friendlyName(yahooSymbol, info?.nameHk || info?.nameCn || info?.nameEn);
  return { name: local, nameEn };
}

function yyyymmdd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function yearsAgo(n: number): Date {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - n);
  return d;
}
