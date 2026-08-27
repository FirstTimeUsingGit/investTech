import { unixToDate } from "@/lib/format";
import type { Market, QuoteSession } from "@/lib/types";

export const SESSION_LABEL_ZH: Record<QuoteSession, string> = {
  pre: "盤前",
  regular: "盤中",
  post: "盤後",
  overnight: "夜盤",
};

export const HK_NO_EXTENDED_NOTE = "港股冇盤前同夜盤。而家收市，顯示最近一次盤中價。";

export type SessionPrint = {
  lastDone: number;
  timestamp: number;
  volume: number;
  high: number;
  low: number;
  prevClose: number;
};

export type HeadlineQuote = {
  session: QuoteSession;
  print: SessionPrint;
  sessionNote: string | null;
};

const TIE_RANK: Record<QuoteSession, number> = {
  regular: 4,
  post: 3,
  pre: 2,
  overnight: 1,
};

function isValidPrint(print?: SessionPrint | null): print is SessionPrint {
  return Boolean(print && Number.isFinite(print.lastDone) && print.lastDone > 0);
}

/** HK regular hours, including lunch: weekdays 09:30–16:00 HKT. */
export function isHkRegularHours(nowMs: number): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Hong_Kong",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(nowMs));
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  if (weekday === "Sat" || weekday === "Sun") return false;
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  const minute = Number(parts.find((p) => p.type === "minute")?.value);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;
  const hm = hour * 100 + minute;
  return hm >= 930 && hm < 1600;
}

export function hkOutsideHoursNote(nowMs: number, lastTimestamp?: number): string | null {
  if (!isHkRegularHours(nowMs)) return HK_NO_EXTENDED_NOTE;
  if (lastTimestamp && lastTimestamp > 0) {
    const quoteDate = unixToDate(lastTimestamp, "Asia/Hong_Kong");
    const today = unixToDate(Math.floor(nowMs / 1000), "Asia/Hong_Kong");
    if (quoteDate < today) return HK_NO_EXTENDED_NOTE;
  }
  return null;
}

/**
 * Headline live price: latest print among sessions that actually have data.
 * HK never uses nested pre/post/overnight even if the payload includes them.
 */
export function pickHeadlineQuote(opts: {
  market: Market;
  regular: SessionPrint;
  pre?: SessionPrint | null;
  post?: SessionPrint | null;
  overnight?: SessionPrint | null;
  nowMs?: number;
}): HeadlineQuote | null {
  const nowMs = opts.nowMs ?? Date.now();
  if (opts.market === "HK") {
    if (!isValidPrint(opts.regular)) return null;
    return {
      session: "regular",
      print: opts.regular,
      sessionNote: hkOutsideHoursNote(nowMs, opts.regular.timestamp),
    };
  }

  const candidates: { session: QuoteSession; print: SessionPrint }[] = [];
  if (isValidPrint(opts.regular)) candidates.push({ session: "regular", print: opts.regular });
  if (isValidPrint(opts.pre)) candidates.push({ session: "pre", print: opts.pre });
  if (isValidPrint(opts.post)) candidates.push({ session: "post", print: opts.post });
  if (isValidPrint(opts.overnight)) candidates.push({ session: "overnight", print: opts.overnight });
  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    const ts = (b.print.timestamp || 0) - (a.print.timestamp || 0);
    if (ts !== 0) return ts;
    return TIE_RANK[b.session] - TIE_RANK[a.session];
  });
  const winner = candidates[0];
  return { session: winner.session, print: winner.print, sessionNote: null };
}
