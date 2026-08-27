import type { Market } from "./types";

const US_SUFFIX = /\.(US|NASDAQ|NYSE)$/i;

export function padHkCode(digits: string): string {
  const stripped = digits.replace(/^0+/, "") || "0";
  if (stripped.length >= 5) return stripped;
  return stripped.padStart(4, "0");
}

export function normalizeTicker(raw: string): {
  symbol: string;
  market: Market;
} | { error: string } {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!cleaned) return { error: "請輸入股票代號，例如 0700 或者 AAPL。" };

  const hkMatch = cleaned.match(/^(\d{1,5})(?:\.HK)?$/);
  if (hkMatch) {
    const code = padHkCode(hkMatch[1]);
    return { symbol: `${code}.HK`, market: "HK" };
  }

  if (US_SUFFIX.test(cleaned)) {
    const base = cleaned.replace(US_SUFFIX, "");
    if (/^[A-Z]{1,5}(-[A-Z])?$/.test(base)) {
      return { symbol: base, market: "US" };
    }
  }

  if (/^[A-Z]{1,5}(-[A-Z])?$/.test(cleaned)) {
    return { symbol: cleaned, market: "US" };
  }

  if (/^\d{1,5}\.[A-Z]{1,3}$/.test(cleaned)) {
    const [digits, exch] = cleaned.split(".");
    if (exch === "HK") return { symbol: `${padHkCode(digits)}.HK`, market: "HK" };
  }

  if (/^[A-Z0-9.-]{1,12}$/.test(cleaned)) {
    const market: Market = cleaned.endsWith(".HK") ? "HK" : "US";
    return { symbol: cleaned, market };
  }

  return {
    error: "睇唔明呢個代號。港股可以打 700、0700、0700.HK；美股打 AAPL 咁樣。",
  };
}

export function displayTicker(symbol: string): string {
  return symbol.toUpperCase();
}

export function inferMarket(symbol: string): Market {
  return symbol.toUpperCase().endsWith(".HK") ? "HK" : "US";
}

export const EXAMPLE_TICKERS = [
  { symbol: "0700.HK", label: "0700.HK 騰訊" },
  { symbol: "9988.HK", label: "9988.HK 阿里" },
  { symbol: "AAPL", label: "AAPL 蘋果" },
  { symbol: "TSLA", label: "TSLA 特斯拉" },
] as const;
