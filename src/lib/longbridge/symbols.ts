import { inferMarket, padHkCode } from "@/lib/ticker";
import type { Market } from "@/lib/types";

/** Internal Yahoo-style `0700.HK` / `AAPL` → Longbridge `700.HK` / `AAPL.US`. */
export function toLongbridgeSymbol(yahooSymbol: string): string {
  const symbol = yahooSymbol.trim().toUpperCase();
  if (symbol.endsWith(".HK")) {
    const digits = symbol.slice(0, -3).replace(/^0+/, "") || "0";
    return `${digits}.HK`;
  }
  if (symbol.endsWith(".US")) return symbol;
  return `${symbol}.US`;
}

/** Longbridge `700.HK` / `AAPL.US` → internal Yahoo-style `0700.HK` / `AAPL`. */
export function fromLongbridgeSymbol(lbSymbol: string): { symbol: string; market: Market } {
  const symbol = lbSymbol.trim().toUpperCase();
  if (symbol.endsWith(".HK")) {
    const digits = symbol.slice(0, -3);
    return { symbol: `${padHkCode(digits)}.HK`, market: "HK" };
  }
  const base = symbol.endsWith(".US") ? symbol.slice(0, -3) : symbol;
  return { symbol: base, market: inferMarket(base) };
}

export function exchangeTimezone(market: Market): string {
  return market === "HK" ? "Asia/Hong_Kong" : "America/New_York";
}
