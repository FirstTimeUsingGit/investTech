import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlossaryTerm } from "@/components/glossary-term";
import type { TradePlan } from "@/lib/types";

export function ExplanationCard({ plan }: { plan: TradePlan }) {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="font-serif text-xl">點解係呢幾個價</CardTitle>
        <p className="text-sm leading-relaxed text-muted-foreground">
          用公開價錢同成交量，唔睇新聞。下面每項都寫清楚：數字係幾多、代表咩、點樣影響三個價。唔明嘅詞可以撳。
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {plan.indicators.length === 0 ? (
          <p className="text-sm text-muted-foreground">呢次未用到足夠指標，所以冇列出細節。</p>
        ) : (
          plan.indicators.map((ind) => (
            <div
              key={ind.key}
              className="rounded-xl border border-border/80 bg-background/50 px-3 py-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <GlossaryTerm id={ind.termId} className="text-sm">
                  {ind.name}
                </GlossaryTerm>
                <span className="price-num text-sm font-medium">{ind.value}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{ind.meaning}</p>
              <p className="mt-1 text-sm leading-relaxed">{ind.effect}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
