import type { Bar, Pivot } from "./types";

export function findPivots(bars: Bar[], left = 5, right = 5): {
  highs: Pivot[];
  lows: Pivot[];
} {
  const highs: Pivot[] = [];
  const lows: Pivot[] = [];
  if (bars.length < left + right + 1) return { highs, lows };

  for (let i = left; i < bars.length - right; i++) {
    const h = bars[i].high;
    const l = bars[i].low;
    let isHigh = true;
    let isLow = true;
    for (let k = 1; k <= left; k++) {
      if (bars[i - k].high > h) isHigh = false;
      if (bars[i - k].low < l) isLow = false;
    }
    for (let k = 1; k <= right; k++) {
      if (bars[i + k].high >= h) isHigh = false;
      if (bars[i + k].low <= l) isLow = false;
    }
    if (isHigh) {
      highs.push({ index: i, date: bars[i].date, price: h });
    }
    if (isLow) {
      lows.push({ index: i, date: bars[i].date, price: l });
    }
  }
  return { highs, lows };
}

export function recentWindow(bars: Bar[], tradingDays: number): Bar[] {
  if (bars.length <= tradingDays) return bars;
  return bars.slice(-tradingDays);
}

export function clusterPrices(
  prices: number[],
  threshold: number,
): { price: number; touches: number }[] {
  if (prices.length === 0) return [];
  const sorted = [...prices].sort((a, b) => a - b);
  const clusters: { sum: number; n: number }[] = [];
  for (const p of sorted) {
    const last = clusters[clusters.length - 1];
    if (!last || Math.abs(p - last.sum / last.n) > threshold) {
      clusters.push({ sum: p, n: 1 });
    } else {
      last.sum += p;
      last.n += 1;
    }
  }
  return clusters
    .map((c) => ({ price: c.sum / c.n, touches: c.n }))
    .sort((a, b) => b.touches - a.touches || b.price - a.price);
}

export function nearestBelow(levels: number[], price: number): number | null {
  const below = levels.filter((l) => l < price * 0.999);
  if (below.length === 0) return null;
  return below.reduce((a, b) => (a > b ? a : b));
}

export function nearestAbove(levels: number[], price: number): number | null {
  const above = levels.filter((l) => l > price * 1.001);
  if (above.length === 0) return null;
  return above.reduce((a, b) => (a < b ? a : b));
}
