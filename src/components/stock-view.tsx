"use client";

import Link from "next/link";
import { PriceHero } from "@/components/price-hero";
import { ExplanationCard } from "@/components/explanation-card";
import { StockChart } from "@/components/stock-chart";
import { StatsRow } from "@/components/stats-row";
import { WatchButton } from "@/components/watch-button";
import { Disclaimer } from "@/components/disclaimer";
import { SearchBox } from "@/components/search-box";
import { Badge } from "@/components/ui/badge";
import { GlossaryTerm } from "@/components/glossary-term";
import { formatDateZh, formatPercent, formatPrice } from "@/lib/format";
import type { StockPayload } from "@/lib/types";

export function StockError({ message }: { message: string }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="max-w-xl rounded-2xl bg-card p-6 ring-1 ring-foreground/8">
        <h1 className="font-serif text-2xl">搵唔到呢隻股票</h1>
        <p className="mt-2 text-muted-foreground">{message}</p>
        <div className="mt-6">
          <SearchBox />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          港股可以打 700、0700、0700.HK；美股打 AAPL。或者返去
          <Link href="/" className="mx-1 underline">
            主頁
          </Link>
          。
        </p>
      </div>
    </main>
  );
}

export function StockView({ data }: { data: StockPayload }) {
  const { quote, analysis, bars } = data;
  const up = (quote.changePercent ?? 0) >= 0;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-3xl font-semibold tracking-tight">{quote.name}</h1>
            <Badge variant="outline">{quote.symbol}</Badge>
            {quote.delayed ? (
              <Badge variant="secondary">延遲行情</Badge>
            ) : (
              <Badge>即時行情</Badge>
            )}
            {quote.market === "HK" ? (
              <Badge variant="outline">港股</Badge>
            ) : (
              <Badge variant="outline">美股</Badge>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {quote.nameEn !== quote.name ? `${quote.nameEn} · ` : null}
            現價 {formatPrice(quote.price, quote.currency)}{" "}
            <span className={up ? "text-target" : "text-stop"}>{formatPercent(quote.changePercent)}</span>
            {" · "}
            截至 {formatDateZh(analysis.stats.lastDate)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <WatchButton symbol={quote.symbol} name={quote.name} />
          <Link
            href={`/replay?ticker=${encodeURIComponent(quote.symbol)}`}
            className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-2.5 text-sm hover:bg-muted"
          >
            用呢隻做覆盤
          </Link>
        </div>
      </div>

      <PriceHero plan={analysis} currency={quote.currency} />

      <div className="rounded-2xl bg-card px-4 py-5 ring-1 ring-foreground/8 sm:px-6">
        <p className="text-xs font-medium tracking-wide text-gold">計劃一句</p>
        <p className="mt-2 font-serif text-xl leading-relaxed text-pretty">{analysis.headline}</p>
        <p className="mt-3 text-base leading-relaxed">{analysis.planSentence}</p>
        <p className="mt-3 text-sm font-medium">{analysis.currentVsPlan}</p>
        {analysis.higherRisk && (
          <p className="mt-3 rounded-lg bg-stop/10 px-3 py-2 text-sm text-stop">
            呢個標咗「較高風險」。跌勢反彈好易失敗，唔好當穩陣抄底。
          </p>
        )}
      </div>

      <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/8 sm:p-5">
        <h2 className="mb-3 font-serif text-lg">走勢圖</h2>
        <StockChart bars={bars} plan={analysis} defaultRange="6M" />
      </section>

      <ExplanationCard plan={analysis} />

      <section>
        <h2 className="mb-3 font-serif text-lg">其他數字（次要）</h2>
        <StatsRow quote={quote} plan={analysis} />
        <p className="mt-3 text-sm text-muted-foreground">
          三個價主要靠 <GlossaryTerm id="ma20">MA20</GlossaryTerm>、
          <GlossaryTerm id="ma50">MA50</GlossaryTerm>、波段高低同{" "}
          <GlossaryTerm id="atr">ATR</GlossaryTerm>。
          <GlossaryTerm id="pe">P/E</GlossaryTerm> 只係旁觀，唔會決定買入價。
        </p>
      </section>

      <Disclaimer />
    </main>
  );
}
