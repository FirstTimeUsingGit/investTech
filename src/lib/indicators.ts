import type { Bar } from "./types";

export function sma(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function lastSma(values: number[], period: number): number | null {
  const series = sma(values, period);
  const v = series[series.length - 1];
  return v ?? null;
}

function trueRange(bars: Bar[], i: number): number {
  const bar = bars[i];
  if (i === 0) return bar.high - bar.low;
  const prev = bars[i - 1].close;
  return Math.max(bar.high - bar.low, Math.abs(bar.high - prev), Math.abs(bar.low - prev));
}

export function atr(bars: Bar[], period = 14): Array<number | null> {
  const out: Array<number | null> = Array(bars.length).fill(null);
  if (bars.length < period + 1) return out;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += trueRange(bars, i);
  out[period - 1] = sum / period;
  for (let i = period; i < bars.length; i++) {
    const prev = out[i - 1] as number;
    out[i] = (prev * (period - 1) + trueRange(bars, i)) / period;
  }
  return out;
}

export function lastAtr(bars: Bar[], period = 14): number | null {
  const series = atr(bars, period);
  const v = series[series.length - 1];
  return v ?? null;
}

export function rsi(closes: number[], period = 14): Array<number | null> {
  const out: Array<number | null> = Array(closes.length).fill(null);
  if (closes.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  const rs0 = avgLoss === 0 ? 100 : avgGain / avgLoss;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs0);
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export function lastRsi(closes: number[], period = 14): number | null {
  const series = rsi(closes, period);
  const v = series[series.length - 1];
  return v ?? null;
}

export function sliceOnOrBefore(bars: Bar[], asOf: string): Bar[] {
  return bars.filter((b) => b.date <= asOf);
}

export function cutoffIndex(bars: Bar[], asOf: string): number {
  let idx = -1;
  for (let i = 0; i < bars.length; i++) {
    if (bars[i].date <= asOf) idx = i;
    else break;
  }
  return idx;
}
