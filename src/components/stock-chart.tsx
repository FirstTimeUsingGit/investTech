"use client";

import * as React from "react";
import { atr, rsi, sma } from "@/lib/indicators";
import type { Bar, ReplayEvent, TradePlan } from "@/lib/types";
import { ChartToggles, DEFAULT_OVERLAYS, type ChartOverlays } from "@/components/chart-toggles";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type ChartRange = "1M" | "3M" | "6M" | "1Y" | "5Y";

const RANGE_DAYS: Record<ChartRange, number> = {
  "1M": 22,
  "3M": 66,
  "6M": 132,
  "1Y": 260,
  "5Y": 800,
};

function lastN<T>(arr: T[], n: number): T[] {
  return arr.length <= n ? arr : arr.slice(-n);
}

export function StockChart({
  bars,
  plan,
  endIndex,
  markers,
  className,
  defaultRange = "6M",
}: {
  bars: Bar[];
  plan: TradePlan;
  endIndex?: number;
  markers?: ReplayEvent[];
  className?: string;
  defaultRange?: ChartRange;
}) {
  const [overlays, setOverlays] = React.useState<ChartOverlays>(DEFAULT_OVERLAYS);
  const [range, setRange] = React.useState<ChartRange>(defaultRange);

  const end = endIndex == null ? bars.length - 1 : Math.min(endIndex, bars.length - 1);
  const until = bars.slice(0, Math.max(end + 1, 1));
  const visible = lastN(until, RANGE_DAYS[range]);
  const warmup = Math.max(0, until.length - visible.length - 60);
  const calcBars = until.slice(warmup);
  const offset = calcBars.length - visible.length;

  const closes = calcBars.map((b) => b.close);
  const ma20s = sma(closes, 20);
  const ma50s = sma(closes, 50);
  const atrs = atr(calcBars, 14);
  const rsis = rsi(closes, 14);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={range} onValueChange={(v) => setRange(v as ChartRange)}>
          <TabsList>
            {(["1M", "3M", "6M", "1Y", "5Y"] as ChartRange[]).map((r) => (
              <TabsTrigger key={r} value={r}>
                {r}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <ChartToggles value={overlays} onChange={setOverlays} />
      </div>
      <SvgChart
        bars={visible}
        ma20={ma20s.slice(offset)}
        ma50={ma50s.slice(offset)}
        atr={atrs.slice(offset)}
        rsi={rsis.slice(offset)}
        plan={plan}
        overlays={overlays}
        markers={markers ?? []}
      />
      <p className="text-xs text-muted-foreground">
        預設打開：20／50天線、支撑阻力、以及三條計劃線。ATR 帶同 RSI 可以自行打開。
      </p>
    </div>
  );
}

function SvgChart({
  bars,
  ma20,
  ma50,
  atr: atrs,
  rsi: rsis,
  plan,
  overlays,
  markers,
}: {
  bars: Bar[];
  ma20: Array<number | null>;
  ma50: Array<number | null>;
  atr: Array<number | null>;
  rsi: Array<number | null>;
  plan: TradePlan;
  overlays: ChartOverlays;
  markers: ReplayEvent[];
}) {
  const showRsi = overlays.rsi;
  const W = 920;
  const padL = 8;
  const padR = 62;
  const padT = 12;
  const gap = showRsi ? 12 : 0;
  const rsiH = showRsi ? 88 : 0;
  const candleH = showRsi ? 268 : 348;
  const H = padT + candleH + gap + rsiH + 28;
  const plotW = W - padL - padR;
  const plotBottom = padT + candleH;

  if (bars.length === 0) {
    return (
      <div className="flex h-[340px] items-center justify-center rounded-2xl bg-card text-sm text-muted-foreground ring-1 ring-foreground/8">
        呢段日子未有圖。
      </div>
    );
  }

  const prices: number[] = bars.flatMap((b) => [b.high, b.low]);
  if (overlays.ma20) prices.push(...ma20.filter((n): n is number => n != null));
  if (overlays.ma50) prices.push(...ma50.filter((n): n is number => n != null));
  if (overlays.plan) {
    for (const n of [plan.buy, plan.buyLow, plan.buyHigh, plan.target, plan.stop]) {
      if (n != null) prices.push(n);
    }
  }
  if (overlays.sr) prices.push(...plan.supports, ...plan.resistances);
  if (overlays.atr) {
    bars.forEach((b, i) => {
      const a = atrs[i];
      if (a != null) {
        prices.push(b.close + a, b.close - a);
      }
    });
  }

  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const padP = (maxP - minP) * 0.06 || 1;
  const yMin = minP - padP;
  const yMax = maxP + padP;
  const y = (p: number) => padT + ((yMax - p) / (yMax - yMin)) * candleH;
  const slot = plotW / bars.length;
  const x = (i: number) => padL + slot * i + slot / 2;
  const bodyW = Math.max(1.2, Math.min(8, slot * 0.62));

  const linePath = (series: Array<number | null>) => {
    let d = "";
    series.forEach((v, i) => {
      if (v == null) return;
      d += d.startsWith("M") ? ` L ${x(i).toFixed(1)} ${y(v).toFixed(1)}` : `M ${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
    });
    return d;
  };

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / ticks);

  const dateBy = Object.fromEntries(bars.map((b, i) => [b.date, i]));
  const rsiTop = plotBottom + gap;
  const rsiY = (v: number) => rsiTop + ((100 - v) / 100) * rsiH;

  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="股價走勢圖">
        <rect width={W} height={H} fill="#fbf8f2" />
        {yTicks.map((p) => (
          <g key={p}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(p)}
              y2={y(p)}
              stroke="#efe8da"
            />
            <text x={W - padR + 6} y={y(p) + 4} fill="#6d6558" fontSize="11">
              {p >= 100 ? p.toFixed(1) : p.toFixed(2)}
            </text>
          </g>
        ))}

        {overlays.atr &&
          bars.map((b, i) => {
            const a = atrs[i];
            if (a == null) return null;
            return (
              <line
                key={`atr-${b.date}`}
                x1={x(i)}
                x2={x(i)}
                y1={y(b.close + a)}
                y2={y(b.close - a)}
                stroke="rgba(156,58,50,0.16)"
                strokeWidth={Math.max(bodyW, 2)}
              />
            );
          })}

        {overlays.sr &&
          plan.supports.slice(0, 3).map((p) => (
            <line
              key={`sup-${p}`}
              x1={padL}
              x2={W - padR}
              y1={y(p)}
              y2={y(p)}
              stroke="rgba(109,101,88,0.7)"
              strokeDasharray="5 4"
            />
          ))}
        {overlays.sr &&
          plan.resistances.slice(0, 3).map((p) => (
            <line
              key={`res-${p}`}
              x1={padL}
              x2={W - padR}
              y1={y(p)}
              y2={y(p)}
              stroke="rgba(176,141,87,0.9)"
              strokeDasharray="5 4"
            />
          ))}

        {overlays.plan && plan.buy != null && (
          <line x1={padL} x2={W - padR} y1={y(plan.buy)} y2={y(plan.buy)} stroke="#1d4e89" strokeWidth="1.8" />
        )}
        {overlays.plan && plan.target != null && (
          <line
            x1={padL}
            x2={W - padR}
            y1={y(plan.target)}
            y2={y(plan.target)}
            stroke="#1e4a38"
            strokeWidth="1.8"
          />
        )}
        {overlays.plan && plan.stop != null && (
          <line x1={padL} x2={W - padR} y1={y(plan.stop)} y2={y(plan.stop)} stroke="#9c3a32" strokeWidth="1.8" />
        )}

        {overlays.ma50 && (
          <path d={linePath(ma50)} fill="none" stroke="#5b7c99" strokeWidth="1.8" />
        )}
        {overlays.ma20 && (
          <path d={linePath(ma20)} fill="none" stroke="#b08d57" strokeWidth="1.8" />
        )}

        {bars.map((b, i) => {
          const up = b.close >= b.open;
          const color = up ? "#1e4a38" : "#9c3a32";
          const top = y(Math.max(b.open, b.close));
          const bot = y(Math.min(b.open, b.close));
          const body = Math.max(bot - top, 1.2);
          return (
            <g key={b.date}>
              <line x1={x(i)} x2={x(i)} y1={y(b.high)} y2={y(b.low)} stroke={color} strokeWidth="1" />
              <rect x={x(i) - bodyW / 2} y={top} width={bodyW} height={body} fill={color} />
            </g>
          );
        })}

        {overlays.plan && plan.buy != null && (
          <text x={W - padR + 6} y={y(plan.buy) + 4} fill="#1d4e89" fontSize="11">
            買入
          </text>
        )}
        {overlays.plan && plan.target != null && (
          <text x={W - padR + 6} y={y(plan.target) + 4} fill="#1e4a38" fontSize="11">
            目標
          </text>
        )}
        {overlays.plan && plan.stop != null && (
          <text x={W - padR + 6} y={y(plan.stop) + 4} fill="#9c3a32" fontSize="11">
            止損
          </text>
        )}

        {markers.map((m) => {
          const i = dateBy[m.date];
          if (i == null) return null;
          const color = m.kind === "stop" ? "#9c3a32" : m.kind === "target" ? "#1e4a38" : "#1d4e89";
          const cy = m.kind === "stop" ? y(bars[i].low) + 12 : y(bars[i].high) - 10;
          return (
            <g key={`${m.date}-${m.kind}`}>
              <circle cx={x(i)} cy={cy} r="5" fill={color} />
              <text x={x(i) + 8} y={cy + 4} fill={color} fontSize="11">
                {m.kind === "entered" ? "入區" : m.kind === "stop" ? "止損" : "目標"}
              </text>
            </g>
          );
        })}

        {showRsi && (
          <g>
            <line x1={padL} x2={W - padR} y1={rsiY(70)} y2={rsiY(70)} stroke="#efe8da" />
            <line x1={padL} x2={W - padR} y1={rsiY(30)} y2={rsiY(30)} stroke="#efe8da" />
            <path
              d={rsis.reduce((d, v, i) => {
                if (v == null) return d;
                return d.startsWith("M")
                  ? `${d} L ${x(i).toFixed(1)} ${rsiY(v).toFixed(1)}`
                  : `M ${x(i).toFixed(1)} ${rsiY(v).toFixed(1)}`;
              }, "")}
              fill="none"
              stroke="#7a5c9e"
              strokeWidth="1.6"
            />
            <text x={W - padR + 6} y={rsiY(70) + 4} fill="#6d6558" fontSize="10">
              70
            </text>
            <text x={W - padR + 6} y={rsiY(30) + 4} fill="#6d6558" fontSize="10">
              30
            </text>
          </g>
        )}

        <text x={padL} y={H - 8} fill="#6d6558" fontSize="11">
          {bars[0]?.date}
        </text>
        <text x={W - padR - 4} y={H - 8} fill="#6d6558" fontSize="11" textAnchor="end">
          {bars[bars.length - 1]?.date}
        </text>
      </svg>
    </div>
  );
}
