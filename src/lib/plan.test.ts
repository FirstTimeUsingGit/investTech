import { describe, expect, it } from "vitest";
import { buildPlan } from "./plan";
import { evaluateReplay } from "./replay";
import { cutoffIndex, sliceOnOrBefore } from "./indicators";
import { normalizeTicker, padHkCode } from "./ticker";
import type { Bar } from "./types";

function makeBars(opts: {
  n?: number;
  start?: string;
  open?: number;
  drift?: number;
  wave?: number;
  vol?: number;
}): Bar[] {
  const n = opts.n ?? 140;
  const drift = opts.drift ?? 0.25;
  const wave = opts.wave ?? 1.2;
  const vol = opts.vol ?? 1.4;
  const startPrice = opts.open ?? 80;
  const start = new Date(`${opts.start ?? "2025-01-02"}T00:00:00Z`);
  const bars: Bar[] = [];
  let price = startPrice;
  for (let i = 0; i < n; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const center = startPrice + drift * i + wave * Math.sin(i / 6);
    price = center;
    const high = price + vol;
    const low = price - vol;
    bars.push({
      time: Math.floor(d.getTime() / 1000),
      date: iso,
      open: price - 0.2,
      high,
      low,
      close: price,
      volume: 1_000_000,
    });
  }
  return bars;
}

describe("ticker", () => {
  it("normalizes HK numbers", () => {
    expect(normalizeTicker("700")).toEqual({ symbol: "0700.HK", market: "HK" });
    expect(normalizeTicker("0700")).toEqual({ symbol: "0700.HK", market: "HK" });
    expect(normalizeTicker("0700.HK")).toEqual({ symbol: "0700.HK", market: "HK" });
    expect(normalizeTicker("700.hk")).toEqual({ symbol: "0700.HK", market: "HK" });
    expect(normalizeTicker("9988")).toEqual({ symbol: "9988.HK", market: "HK" });
    expect(padHkCode("7")).toBe("0007");
  });

  it("normalizes US tickers", () => {
    expect(normalizeTicker("aapl")).toEqual({ symbol: "AAPL", market: "US" });
    expect(normalizeTicker("AAPL.US")).toEqual({ symbol: "AAPL", market: "US" });
    expect(normalizeTicker("BRK-B")).toEqual({ symbol: "BRK-B", market: "US" });
  });
});

describe("swing plan", () => {
  it("never outputs a buy above the stop in an uptrend", () => {
    const bars = makeBars({ drift: 0.4, open: 60, n: 160 });
    const plan = buildPlan(bars);
    if (plan.buy != null && plan.stop != null) {
      expect(plan.buy).toBeGreaterThan(plan.stop);
    }
    expect(plan.trend).toBe("up");
  });

  it("does not chase a downtrend", () => {
    const bars = makeBars({ drift: -0.45, open: 180, n: 160, wave: 0.8 });
    const plan = buildPlan(bars);
    expect(plan.trend).toBe("down");
    expect(plan.stance).toBe("do_not_chase");
    expect(plan.actionable).toBe(false);
    expect(plan.headline).toMatch(/不建議追買/);
    expect(plan.buy).toBeNull();
  });

  it("keeps reward:risk honest when it cannot reach 1.5", () => {
    const bars = makeBars({ drift: 0.02, open: 100, n: 120, wave: 0.3, vol: 4 });
    const plan = buildPlan(bars);
    if (plan.actionable && plan.rewardRisk != null) {
      expect(plan.rewardRisk).toBeGreaterThanOrEqual(1.45);
    }
    if (!plan.actionable && plan.whyNot) {
      expect(plan.whyNot.length).toBeGreaterThan(4);
    }
  });
});

describe("no look-ahead", () => {
  it("plan on a past date ignores later bars", () => {
    const bars = makeBars({ drift: 0.35, open: 50, n: 200 });
    const asOf = bars[120].date;
    const sliced = sliceOnOrBefore(bars, asOf);
    const planThen = buildPlan(sliced);
    const planIfLeaked = buildPlan(bars);
    expect(sliced[sliced.length - 1].date).toBe(asOf);
    expect(sliced.every((b) => b.date <= asOf)).toBe(true);
    expect(cutoffIndex(bars, asOf)).toBe(120);
    expect(planThen.stats.lastDate).toBe(asOf);
    expect(planThen.stats.lastClose).toBe(bars[120].close);
    expect(planIfLeaked.stats.lastDate).not.toBe(asOf);
  });
});

describe("replay evaluation", () => {
  it("detects target after entry without looking at the plan date", () => {
    const history = makeBars({ drift: 0.3, open: 70, n: 130 });
    const asOf = history[100].date;
    const plan = buildPlan(sliceOnOrBefore(history, asOf));
    const future = history.slice(101);
    if (plan.actionable && plan.buy != null && plan.target != null && plan.stop != null) {
      const forcedFuture: Bar[] = [
        {
          ...future[0],
          date: "2099-01-02",
          low: plan.buyLow ?? plan.buy,
          high: (plan.buyLow ?? plan.buy) + 0.1,
          close: plan.buy,
          open: plan.buy,
        },
        {
          ...future[1],
          date: "2099-01-03",
          low: plan.buy,
          high: plan.target + 1,
          close: plan.target,
          open: plan.buy,
        },
      ];
      const result = evaluateReplay(plan, forcedFuture);
      expect(result.entered).toBe(true);
      expect(result.outcome).toBe("plan_hit");
    }
  });

  it("marks same-day stop and target as stopped-then-target", () => {
    const history = makeBars({ drift: 0.3, open: 70, n: 130 });
    const plan = buildPlan(history);
    if (!plan.actionable || plan.buy == null || plan.stop == null || plan.target == null) {
      return;
    }
    const result = evaluateReplay(plan, [
      {
        time: 1,
        date: "2099-02-01",
        open: plan.buy,
        close: plan.buy,
        low: plan.stop - 1,
        high: plan.target + 1,
        volume: 1,
      },
    ]);
    expect(result.outcome).toBe("stopped_then_target");
  });
});
