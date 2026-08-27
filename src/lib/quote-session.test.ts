import { describe, expect, it } from "vitest";
import {
  HK_NO_EXTENDED_NOTE,
  SESSION_LABEL_ZH,
  pickHeadlineQuote,
  type SessionPrint,
} from "./quote-session";

function print(lastDone: number, timestamp: number, extra: Partial<SessionPrint> = {}): SessionPrint {
  return {
    lastDone,
    timestamp,
    volume: extra.volume ?? 1_000,
    high: extra.high ?? lastDone,
    low: extra.low ?? lastDone,
    prevClose: extra.prevClose ?? lastDone - 1,
  };
}

const REGULAR_TS = 1_700_000_000;
const PRE_TS = REGULAR_TS - 3 * 3600;
const POST_TS = REGULAR_TS + 2 * 3600;
const OVERNIGHT_TS = REGULAR_TS + 8 * 3600;

describe("US headline session selection", () => {
  it("uses 盤前 when pre-market is the newest print", () => {
    const picked = pickHeadlineQuote({
      market: "US",
      regular: print(186, REGULAR_TS),
      pre: print(187.5, REGULAR_TS + 20 * 3600),
      post: print(186.2, POST_TS),
      overnight: print(185.8, OVERNIGHT_TS - 24 * 3600),
    });
    expect(picked?.session).toBe("pre");
    expect(picked?.print.lastDone).toBe(187.5);
    expect(SESSION_LABEL_ZH[picked!.session]).toBe("盤前");
  });

  it("uses 盤中 when regular hours are the newest print", () => {
    const picked = pickHeadlineQuote({
      market: "US",
      regular: print(190, REGULAR_TS),
      pre: print(188, PRE_TS),
      post: print(189, POST_TS - 24 * 3600),
      overnight: print(187, OVERNIGHT_TS - 24 * 3600),
    });
    expect(picked?.session).toBe("regular");
    expect(picked?.print.lastDone).toBe(190);
    expect(SESSION_LABEL_ZH[picked!.session]).toBe("盤中");
  });

  it("uses 盤後 when after-hours is the newest print", () => {
    const picked = pickHeadlineQuote({
      market: "US",
      regular: print(190, REGULAR_TS),
      pre: print(188, PRE_TS),
      post: print(191.4, POST_TS),
      overnight: null,
    });
    expect(picked?.session).toBe("post");
    expect(picked?.print.lastDone).toBe(191.4);
    expect(SESSION_LABEL_ZH[picked!.session]).toBe("盤後");
  });

  it("uses 夜盤 when overnight is the newest print", () => {
    const picked = pickHeadlineQuote({
      market: "US",
      regular: print(190, REGULAR_TS),
      pre: print(188, PRE_TS),
      post: print(191, POST_TS),
      overnight: print(192.2, OVERNIGHT_TS),
    });
    expect(picked?.session).toBe("overnight");
    expect(picked?.print.lastDone).toBe(192.2);
    expect(SESSION_LABEL_ZH[picked!.session]).toBe("夜盤");
  });

  it("ignores empty nested quotes and keeps regular", () => {
    const picked = pickHeadlineQuote({
      market: "US",
      regular: print(190, REGULAR_TS),
      pre: print(0, PRE_TS + 10_000),
      post: print(0, POST_TS + 10_000),
      overnight: print(0, OVERNIGHT_TS + 10_000),
    });
    expect(picked?.session).toBe("regular");
    expect(picked?.print.lastDone).toBe(190);
  });

  it("prefers regular on a timestamp tie so stale copies are not labelled 夜盤", () => {
    const picked = pickHeadlineQuote({
      market: "US",
      regular: print(190, REGULAR_TS),
      pre: print(190, REGULAR_TS),
      post: print(190, REGULAR_TS),
      overnight: print(190, REGULAR_TS),
    });
    expect(picked?.session).toBe("regular");
  });
});

describe("HK has no overnight or pre-market", () => {
  const hkOpen = Date.parse("2026-08-25T02:00:00Z"); // Tue 10:00 HKT
  const hkClosed = Date.parse("2026-08-25T12:30:00Z"); // Tue 20:30 HKT
  const hkPrintTs = Math.floor(hkOpen / 1000);

  it("keeps the regular print even if nested overnight/pre quotes are newer", () => {
    const picked = pickHeadlineQuote({
      market: "HK",
      regular: print(338, hkPrintTs),
      pre: print(340, hkPrintTs + 8 * 3600),
      post: print(341, hkPrintTs + 8 * 3600 + 60),
      overnight: print(350, hkPrintTs + 8 * 3600 + 120),
      nowMs: hkOpen,
    });
    expect(picked?.session).toBe("regular");
    expect(picked?.print.lastDone).toBe(338);
    expect(picked?.sessionNote).toBeNull();
    expect(SESSION_LABEL_ZH[picked!.session]).toBe("盤中");
  });

  it("adds a short closed-market note outside HK hours", () => {
    const picked = pickHeadlineQuote({
      market: "HK",
      regular: print(338, REGULAR_TS),
      overnight: print(350, OVERNIGHT_TS),
      nowMs: hkClosed,
    });
    expect(picked?.session).toBe("regular");
    expect(picked?.print.lastDone).toBe(338);
    expect(picked?.sessionNote).toBe(HK_NO_EXTENDED_NOTE);
  });
});
