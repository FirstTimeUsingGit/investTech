import { GlossaryTerm } from "@/components/glossary-term";
import { formatPrice } from "@/lib/format";
import type { TradePlan } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PriceHero({
  plan,
  currency,
}: {
  plan: TradePlan;
  currency: string;
}) {
  const items = [
    {
      key: "buy",
      label: "建議買入價",
      term: "buy-zone",
      value: plan.actionable ? formatPrice(plan.buy, currency) : "暫不追買",
      sub:
        plan.actionable && plan.buyLow != null && plan.buyHigh != null
          ? `區 ${formatPrice(plan.buyLow)} – ${formatPrice(plan.buyHigh)}`
          : plan.whyNot ?? "現在不建議追買",
      tone: "buy" as const,
    },
    {
      key: "target",
      label: "目標賣出價",
      term: "target",
      value: formatPrice(plan.target, currency),
      sub: plan.actionable
        ? plan.rewardRisk
          ? `風險回報約 ${plan.rewardRisk.toFixed(1)} : 1`
          : "下一個阻力／保守目標"
        : "觀察阻力／失效位",
      tone: "target" as const,
    },
    {
      key: "stop",
      label: "止損價",
      term: "stop",
      value: formatPrice(plan.stop, currency),
      sub: plan.actionable ? "低過呢度，計劃取消" : "觀察支撑／失效位",
      tone: "stop" as const,
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.key}
          className={cn(
            "rounded-2xl bg-card px-4 py-5 ring-1 ring-foreground/8 sm:px-5",
            item.tone === "buy" && "shadow-[inset_4px_0_0_0_var(--buy)]",
            item.tone === "target" && "shadow-[inset_4px_0_0_0_var(--target)]",
            item.tone === "stop" && "shadow-[inset_4px_0_0_0_var(--stop)]",
          )}
        >
          <div className="text-sm text-muted-foreground">
            <GlossaryTerm id={item.term}>{item.label}</GlossaryTerm>
          </div>
          <div
            className={cn(
              "price-num mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl",
              item.tone === "buy" && "text-buy",
              item.tone === "target" && "text-target",
              item.tone === "stop" && "text-stop",
            )}
          >
            {item.value}
          </div>
          <p className="mt-2 text-sm leading-snug text-muted-foreground">{item.sub}</p>
        </div>
      ))}
    </section>
  );
}
