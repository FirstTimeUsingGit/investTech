import { formatCompact, formatNumber, formatPercent, formatPrice } from "@/lib/format";
import { GlossaryTerm } from "@/components/glossary-term";
import { SESSION_LABEL_ZH } from "@/lib/quote-session";
import type { Quote, TradePlan } from "@/lib/types";

export function StatsRow({ quote, plan }: { quote: Quote; plan: TradePlan }) {
  const priceLabel =
    quote.source === "longbridge" && quote.session
      ? `現價（${SESSION_LABEL_ZH[quote.session]}）`
      : "現價";
  const items = [
    { label: priceLabel, value: formatPrice(quote.price, quote.currency) },
    { label: "今日升跌", value: formatPercent(quote.changePercent) },
    { label: "MA20", value: formatPrice(plan.stats.ma20), term: "ma20" },
    { label: "MA50", value: formatPrice(plan.stats.ma50), term: "ma50" },
    { label: "ATR(14)", value: formatPrice(plan.stats.atr14), term: "atr" },
    { label: "RSI(14)", value: formatNumber(plan.stats.rsi14, 1), term: "rsi" },
    { label: "52週高", value: formatPrice(quote.fiftyTwoWeekHigh) },
    { label: "52週低", value: formatPrice(quote.fiftyTwoWeekLow) },
    { label: "市值", value: formatCompact(quote.marketCap) },
    { label: "P/E", value: formatNumber(quote.peTrailing, 1), term: "pe" },
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border ring-1 ring-foreground/8 sm:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="bg-card px-3 py-3">
          <dt className="text-xs text-muted-foreground">
            {item.term ? <GlossaryTerm id={item.term}>{item.label}</GlossaryTerm> : item.label}
          </dt>
          <dd className="price-num mt-1 text-sm font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
