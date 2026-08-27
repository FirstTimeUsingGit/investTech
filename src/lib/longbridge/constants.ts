/** Quote-only OAuth scopes from discovery. Never request trading/order scopes. */
export const QUOTE_SCOPES = ["4", "6", "10", "11"] as const;

export const HTTP_BASE = "https://openapi.longbridge.com";
export const QUOTE_WS_URL = "wss://openapi-quote.longbridge.com/v2";
export const QUOTE_WS_URL_FALLBACK = "wss://openapi-quote.longbridge.com";

export const SID_COOKIE = "lb_sid";
export const OAUTH_STATE_COOKIE = "lb_oauth";

export const CALLBACK_PATH = "/api/longbridge/callback";

export const CMD = {
  close: 0,
  heartbeat: 1,
  auth: 2,
  staticInfo: 10,
  quote: 11,
  candlestick: 19,
  historyCandlestick: 27,
} as const;

export const PERIOD_DAY = 1000;
export const ADJUST_NO = 0;
export const QUERY_BY_DATE = 2;
