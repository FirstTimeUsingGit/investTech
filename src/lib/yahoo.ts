import { inferMarket, normalizeTicker } from "./ticker";
import { unixToDate } from "./format";
import { friendlyName } from "./names";
import type { Bar, Quote, SearchHit } from "./types";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

type CrumbState = {
  cookie: string;
  crumb: string;
  at: number;
};

let crumbState: CrumbState | null = null;
const CRUMB_TTL = 25 * 60 * 1000;

const memory = new Map<string, { at: number; data: unknown }>();

function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const hit = memory.get(key);
  if (hit && Date.now() - hit.at < ttl) return Promise.resolve(hit.data as T);
  return fn().then((data) => {
    memory.set(key, { at: Date.now(), data });
    return data;
  });
}

function readCookies(res: Response): string {
  const headers = res.headers as Headers & { getSetCookie?: () => string[] };
  const list = headers.getSetCookie?.() ?? [];
  if (list.length) return list.map((c) => c.split(";")[0]).join("; ");
  const raw = res.headers.get("set-cookie");
  if (!raw) return "";
  return raw
    .split(/,(?=\s*[A-Za-z0-9_\-]+=)/)
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

async function refreshCrumb(): Promise<CrumbState> {
  const cookieRes = await fetch("https://fc.yahoo.com", {
    headers: { "User-Agent": UA, Accept: "text/html" },
    redirect: "manual",
  });
  const cookie = readCookies(cookieRes);

  const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: {
      "User-Agent": UA,
      Accept: "text/plain,application/json",
      Cookie: cookie,
    },
  });
  const crumb = (await crumbRes.text()).trim();
  if (!crumb || crumb.length > 40 || crumb.toLowerCase().includes("html")) {
    throw new Error("行情服務暫時忙碌，請稍後再試。");
  }
  crumbState = { cookie, crumb, at: Date.now() };
  return crumbState;
}

async function getCrumb(force = false): Promise<CrumbState> {
  if (!force && crumbState && Date.now() - crumbState.at < CRUMB_TTL) return crumbState;
  return refreshCrumb();
}

async function yahooGet(url: string, retry = true): Promise<Response> {
  const { cookie, crumb } = await getCrumb();
  const joined = url.includes("?") ? `${url}&crumb=${encodeURIComponent(crumb)}` : `${url}?crumb=${encodeURIComponent(crumb)}`;
  const res = await fetch(joined, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      Cookie: cookie,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if ((res.status === 401 || res.status === 403 || res.status === 422 || res.status === 429) && retry) {
    await new Promise((r) => setTimeout(r, res.status === 429 ? 400 : 0));
    await getCrumb(true);
    return yahooGet(url, false);
  }
  return res;
}

type ChartResult = {
  meta: {
    currency?: string;
    symbol?: string;
    exchangeName?: string;
    fullExchangeName?: string;
    instrumentType?: string;
    timezone?: string;
    exchangeTimezoneName?: string;
    regularMarketPrice?: number;
    chartPreviousClose?: number;
    previousClose?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
    regularMarketDayHigh?: number;
    regularMarketDayLow?: number;
    regularMarketVolume?: number;
    shortName?: string;
    longName?: string;
    priceHint?: number;
  };
  timestamp?: number[];
  indicators: {
    quote: Array<{
      open?: Array<number | null>;
      high?: Array<number | null>;
      low?: Array<number | null>;
      close?: Array<number | null>;
      volume?: Array<number | null>;
    }>;
  };
};

export async function fetchChart(symbol: string, range = "5y"): Promise<{
  bars: Bar[];
  meta: ChartResult["meta"];
}> {
  return cached(`chart:${symbol}:${range}`, 2 * 60 * 1000, async () => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}&events=div%2Csplit&includePrePost=false`;
    const res = await yahooGet(url);
    if (res.status === 404) {
      throw Object.assign(new Error("搵唔到呢隻股票。檢查下代號？"), { status: 404 });
    }
    if (!res.ok) {
      throw new Error("暫時攞唔到行情，過一陣再試。");
    }
    const json = (await res.json()) as {
      chart?: { result?: ChartResult[] | null; error?: { description?: string } | null };
    };
    const result = json.chart?.result?.[0];
    if (!result) {
      throw Object.assign(new Error("搵唔到呢隻股票。港股試 0700.HK，美股試 AAPL。"), {
        status: 404,
      });
    }
    const tz = result.meta.exchangeTimezoneName || result.meta.timezone || "Asia/Hong_Kong";
    const q = result.indicators.quote?.[0];
    const times = result.timestamp ?? [];
    const bars: Bar[] = [];
    for (let i = 0; i < times.length; i++) {
      const open = q?.open?.[i];
      const high = q?.high?.[i];
      const low = q?.low?.[i];
      const close = q?.close?.[i];
      if (
        open == null ||
        high == null ||
        low == null ||
        close == null ||
        !Number.isFinite(close)
      ) {
        continue;
      }
      bars.push({
        time: times[i],
        date: unixToDate(times[i], tz),
        open,
        high,
        low,
        close,
        volume: q?.volume?.[i] ?? 0,
      });
    }
    if (bars.length < 20) {
      throw new Error("呢隻股票嘅歷史價錢太短，未夠計波段。");
    }
    return { bars, meta: result.meta };
  });
}

type QuoteSummary = {
  price?: {
    longName?: string;
    shortName?: string;
    currency?: string;
    regularMarketPrice?: { raw?: number };
    regularMarketPreviousClose?: { raw?: number };
    regularMarketChange?: { raw?: number };
    regularMarketChangePercent?: { raw?: number };
    marketCap?: { raw?: number };
    exchangeName?: string;
  };
  summaryDetail?: {
    trailingPE?: { raw?: number };
    marketCap?: { raw?: number };
    fiftyTwoWeekHigh?: { raw?: number };
    fiftyTwoWeekLow?: { raw?: number };
    volume?: { raw?: number };
    previousClose?: { raw?: number };
  };
};

export async function fetchQuoteExtras(symbol: string): Promise<{
  pe: number | null;
  marketCap: number | null;
  name: string | null;
}> {
  return cached(`qs:${symbol}`, 5 * 60 * 1000, async () => {
    try {
      const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=price,summaryDetail`;
      const res = await yahooGet(url);
      if (!res.ok) return { pe: null, marketCap: null, name: null };
      const json = (await res.json()) as {
        quoteSummary?: { result?: QuoteSummary[] | null };
      };
      const r = json.quoteSummary?.result?.[0];
      return {
        pe: r?.summaryDetail?.trailingPE?.raw ?? null,
        marketCap: r?.summaryDetail?.marketCap?.raw ?? r?.price?.marketCap?.raw ?? null,
        name: r?.price?.longName ?? r?.price?.shortName ?? null,
      };
    } catch {
      return { pe: null, marketCap: null, name: null };
    }
  });
}

export async function searchYahoo(q: string): Promise<SearchHit[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];
  const normalized = normalizeTicker(trimmed);
  return cached(`search:${trimmed.toUpperCase()}`, 60 * 1000, async () => {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(trimmed)}&quotesCount=8&newsCount=0&listsCount=0`;
    const res = await yahooGet(url);
    if (!res.ok) {
      if ("symbol" in normalized) {
        return [
          {
            symbol: normalized.symbol,
            name: friendlyName(normalized.symbol),
            nameEn: normalized.symbol,
            exchange: normalized.market === "HK" ? "HKG" : "US",
            market: normalized.market,
          },
        ];
      }
      return [];
    }
    const json = (await res.json()) as {
      quotes?: Array<{
        symbol?: string;
        shortname?: string;
        longname?: string;
        exchange?: string;
        exchDisp?: string;
        quoteType?: string;
      }>;
    };
    const hits: SearchHit[] = [];
    for (const row of json.quotes ?? []) {
      if (!row.symbol || (row.quoteType && row.quoteType !== "EQUITY")) continue;
      const parsed = normalizeTicker(row.symbol);
      if ("error" in parsed) continue;
      const exch = (row.exchange ?? "").toUpperCase();
      const disp = (row.exchDisp ?? "").toLowerCase();
      const isHk = parsed.market === "HK" || exch === "HKG" || disp.includes("hong kong");
      const isUs =
        parsed.market === "US" &&
        (["NMS", "NYQ", "NGM", "ASE", "PCX", "NASDAQ", "NYSE", "NCM", "BTS"].includes(exch) ||
          disp.includes("nasdaq") ||
          disp.includes("nyse") ||
          disp.includes("nyse") ||
          !row.symbol.includes("."));
      if (!isHk && !isUs) continue;
      if (hits.some((h) => h.symbol === parsed.symbol)) continue;
      hits.push({
        symbol: parsed.symbol,
        name: friendlyName(parsed.symbol, row.shortname || row.longname),
        nameEn: row.longname || row.shortname || parsed.symbol,
        exchange: row.exchDisp || row.exchange || (isHk ? "香港" : "美國"),
        market: isHk ? "HK" : "US",
      });
    }
    if ("symbol" in normalized && !hits.some((h) => h.symbol === normalized.symbol)) {
      hits.unshift({
        symbol: normalized.symbol,
        name: friendlyName(normalized.symbol),
        nameEn: normalized.symbol,
        exchange: normalized.market === "HK" ? "香港" : "美國",
        market: normalized.market,
      });
    }
    return hits.slice(0, 8);
  });
}

export async function loadQuoteAndBars(symbol: string): Promise<{ quote: Quote; bars: Bar[] }> {
  const [{ bars, meta }, extras] = await Promise.all([
    fetchChart(symbol, "5y"),
    fetchQuoteExtras(symbol),
  ]);
  const last = bars[bars.length - 1];
  const prevBar = bars.length > 1 ? bars[bars.length - 2] : null;
  const price = meta.regularMarketPrice ?? last.close;
  const prev = prevBar?.close ?? meta.previousClose ?? meta.chartPreviousClose ?? null;
  const change = prev != null ? price - prev : null;
  const changePercent = prev ? (change! / prev) * 100 : null;
  const market = inferMarket(symbol);
  const quote: Quote = {
    symbol,
    name: friendlyName(symbol, extras.name || meta.shortName || meta.longName),
    nameEn: extras.name || meta.longName || meta.shortName || symbol,
    currency: meta.currency || (market === "HK" ? "HKD" : "USD"),
    market,
    exchange: meta.fullExchangeName || meta.exchangeName || (market === "HK" ? "HKSE" : "US"),
    price,
    previousClose: prev,
    change,
    changePercent,
    dayHigh: meta.regularMarketDayHigh ?? last.high,
    dayLow: meta.regularMarketDayLow ?? last.low,
    volume: meta.regularMarketVolume ?? last.volume,
    marketCap: extras.marketCap,
    peTrailing: extras.pe,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
    timezone: meta.exchangeTimezoneName || "Asia/Hong_Kong",
    delayed: true,
    source: "yahoo",
  };
  return { quote, bars };
}
