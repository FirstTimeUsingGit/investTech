"use client";

import * as React from "react";
import Link from "next/link";
import { Pause, Play, SkipForward, StepForward } from "lucide-react";
import { SearchBox } from "@/components/search-box";
import { PriceHero } from "@/components/price-hero";
import { ExplanationCard } from "@/components/explanation-card";
import { Disclaimer } from "@/components/disclaimer";
import { StockChart } from "@/components/stock-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { evaluateReplay, OUTCOME_LABEL } from "@/lib/replay";
import { formatDateZh, todayHk } from "@/lib/format";
import { getReplays, saveReplay, updateReplayOutcome, type SavedReplay } from "@/lib/storage";
import type { ReplayEvent, ReplayResult, StockPayload } from "@/lib/types";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function fromPayload(payload: StockPayload): {
  result: ReplayResult;
  playIndex: number;
} {
  const future = payload.bars.slice(payload.cutoffIndex + 1);
  return {
    result: evaluateReplay(payload.analysis, future),
    playIndex: payload.cutoffIndex,
  };
}

export function ReplayView({
  initialTicker,
  initialAsOf,
  initialPayload,
  initialError,
  initialReveal = false,
}: {
  initialTicker?: string;
  initialAsOf?: string;
  initialPayload?: StockPayload | null;
  initialError?: string | null;
  initialReveal?: boolean;
}) {
  const seeded = initialPayload ? fromPayload(initialPayload) : null;
  const ticker = initialPayload?.quote.symbol ?? initialTicker ?? "0700.HK";
  const [asOf, setAsOf] = React.useState(initialPayload?.asOf ?? initialAsOf ?? daysAgo(90));
  const data = initialPayload ?? null;
  const error = initialError ?? null;
  const [playIndex, setPlayIndex] = React.useState<number | null>(
    initialReveal && initialPayload
      ? initialPayload.bars.length - 1
      : (seeded?.playIndex ?? null),
  );
  const [playing, setPlaying] = React.useState(false);
  const result = seeded?.result ?? null;
  const [revealed, setRevealed] = React.useState(Boolean(initialReveal && seeded));
  const [sessions, setSessions] = React.useState<SavedReplay[]>([]);
  const sessionId = React.useRef<string>(
    initialPayload ? `${initialPayload.quote.symbol}-${initialPayload.asOf}-ssr` : "",
  );

  React.useEffect(() => {
    setSessions(getReplays());
    if (initialPayload) {
      const id = `${initialPayload.quote.symbol}-${initialPayload.asOf}-${Date.now()}`;
      sessionId.current = id;
      const list = saveReplay({
        id,
        symbol: initialPayload.quote.symbol,
        name: initialPayload.quote.name,
        asOf: initialPayload.asOf,
        savedAt: new Date().toISOString(),
      });
      setSessions(
        initialReveal && seeded
          ? updateReplayOutcome(id, seeded.result.outcome)
          : list,
      );
    }
  }, [initialPayload, initialReveal]);

  React.useEffect(() => {
    if (!playing || data == null || playIndex == null) return;
    if (playIndex >= data.bars.length - 1) {
      setPlaying(false);
      setRevealed(true);
      if (result) {
        setSessions(updateReplayOutcome(sessionId.current, result.outcome));
      }
      return;
    }
    const t = window.setTimeout(() => setPlayIndex((i) => (i == null ? i : i + 1)), 260);
    return () => window.clearTimeout(t);
  }, [playing, playIndex, data, result]);

  const visibleEvents: ReplayEvent[] = React.useMemo(() => {
    if (!data || playIndex == null || !result) return [];
    const today = data.bars[playIndex]?.date;
    if (!today) return [];
    return result.events.filter((e) => e.date <= today);
  }, [data, playIndex, result]);

  const liveNote = React.useMemo(() => {
    if (!data || playIndex == null) return "";
    const date = data.bars[playIndex]?.date;
    if (!date) return "";
    const lastEvent = visibleEvents[visibleEvents.length - 1];
    if (!lastEvent) return `${formatDateZh(date)}：仲未踏入買入區。`;
    if (lastEvent.kind === "entered") return `${formatDateZh(date)}：價錢踏入買入區。`;
    if (lastEvent.kind === "stop") return `${formatDateZh(date)}：觸及止損。`;
    return `${formatDateZh(date)}：觸及目標。`;
  }, [data, playIndex, visibleEvents]);

  const atEnd = data != null && playIndex != null && playIndex >= data.bars.length - 1;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 pb-16">
      <header className="space-y-3">
        <p className="text-sm font-medium text-gold">覆盤模式</p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">用舊日子學，唔使真金白銀</h1>
        <p className="max-w-2xl text-muted-foreground leading-relaxed">
          揀一隻股票同一個「當日」。系統只用嗰日或之前嘅價錢計三個價，之後逐日播放，睇下先撞到買入區、止損定目標。冇透視未來。
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">設定當日</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action="/replay" method="get" className="space-y-4">
            <SearchBox
              key={ticker}
              initial={ticker}
              submitLabel="用呢隻"
              inputName="ticker"
              embedded
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex-1 text-sm">
                <span className="mb-1 block text-muted-foreground">當日（只用呢日或之前嘅資料）</span>
                <Input
                  type="date"
                  name="asOf"
                  value={asOf}
                  max={todayHk()}
                  onChange={(e) => setAsOf(e.target.value)}
                />
              </label>
              <Button type="submit" className="sm:mb-px">
                開始覆盤
              </Button>
            </div>
          </form>
          <p className="text-xs text-muted-foreground">建議揀大約三個月前，先有足夠日子睇結果。</p>
        </CardContent>
      </Card>

      {sessions.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">最近覆盤</h2>
          <div className="flex flex-wrap gap-2">
            {sessions.map((s) => (
              <Link
                key={s.id}
                href={`/replay?ticker=${encodeURIComponent(s.symbol)}&asOf=${encodeURIComponent(s.asOf)}`}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-gold"
              >
                {s.symbol} · {s.asOf}
                {s.outcome ? ` · ${OUTCOME_LABEL[s.outcome]}` : ""}
              </Link>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-card p-6 ring-1 ring-foreground/8">
          <h2 className="font-serif text-xl">覆盤開唔到</h2>
          <p className="mt-2 text-muted-foreground">{error}</p>
        </div>
      )}

      {data && playIndex != null && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-2xl">{data.quote.name}</h2>
            <Badge variant="outline">{data.quote.symbol}</Badge>
            <Badge variant="secondary">當日 {formatDateZh(data.asOf)}</Badge>
            {data.quote.source === "longbridge" ? (
              <Badge>Longbridge 日K</Badge>
            ) : (
              <Badge variant="outline">延遲行情</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            以下三個價只用 {formatDateZh(data.asOf)} 或之前嘅 K 線。圖表往後播嗰啲係後來先發生嘅事。
          </p>

          <PriceHero plan={data.analysis} currency={data.quote.currency} />
          <div className="rounded-2xl bg-card px-4 py-4 ring-1 ring-foreground/8">
            <p className="font-serif text-lg">{data.analysis.headline}</p>
            <p className="mt-2 leading-relaxed">{data.analysis.planSentence}</p>
            <p className="mt-2 text-sm font-medium">{data.analysis.currentVsPlan}</p>
          </div>

          <section className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/8 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                disabled={atEnd}
              >
                {playing ? <Pause /> : <Play />}
                {playing ? "暫停" : "播放"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPlayIndex((i) => (i == null ? i : Math.min(i + 1, data.bars.length - 1)))}
                disabled={atEnd}
              >
                <StepForward />
                前一日
              </Button>
              <Button
                type="button"
                variant="secondary"
                asChild
              >
                <Link
                  href={`/replay?ticker=${encodeURIComponent(data.quote.symbol)}&asOf=${data.asOf}&end=1`}
                >
                  <SkipForward />
                  跳到結果
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground">
                播放到 {formatDateZh(data.bars[playIndex].date)}
              </span>
            </div>
            <p className="text-sm font-medium">{liveNote}</p>
            <StockChart
              bars={data.bars}
              plan={data.analysis}
              endIndex={playIndex}
              markers={visibleEvents}
              defaultRange="6M"
            />
          </section>

          <ExplanationCard plan={data.analysis} />

          {revealed && result && (
            <Card className="border-gold/40">
              <CardHeader>
                <CardTitle className="font-serif text-2xl">
                  結果：{OUTCOME_LABEL[result.outcome]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="leading-relaxed">{result.lesson}</p>
                {result.events.length > 0 && (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {result.events.map((e, i) => (
                      <li key={`${e.date}-${e.kind}-${i}`}>
                        {formatDateZh(e.date)} ·{" "}
                        {e.kind === "entered" ? "踏入買入區" : e.kind === "stop" ? "觸及止損" : "觸及目標"}
                      </li>
                    ))}
                  </ul>
                )}
                <Disclaimer compact />
              </CardContent>
            </Card>
          )}
        </>
      )}

      <p className="text-sm text-muted-foreground">
        覆盤紀錄只存在你部瀏覽器，唔會上傳。想知詞彙，去{" "}
        <Link href="/terms" className="underline">
          詞彙頁
        </Link>
        。
      </p>
    </main>
  );
}
