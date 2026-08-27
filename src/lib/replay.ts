import type { ReplayEvent, ReplayOutcome, ReplayResult, TradePlan } from "./types";
import type { Bar } from "./types";
import { formatPrice } from "./format";

function outcomeLesson(outcome: ReplayOutcome, plan: TradePlan): string {
  const buy = plan.buy != null ? formatPrice(plan.buy) : "買入區";
  const stop = plan.stop != null ? formatPrice(plan.stop) : "止損";
  const target = plan.target != null ? formatPrice(plan.target) : "目標";

  switch (outcome) {
    case "plan_hit":
      return `價錢先踏入買入區（${buy}），之後升到目標（${target}），中間冇跌穿止損。呢次覆盤教你：一個有纪律嘅計劃，係等回調先入，唔係見到升就追；目標同止損要事前寫低。`;
    case "stopped":
      return `價錢入咗之後跌穿止損（${stop}），計劃按規矩收場。止損唔係「輸咗好慘」，而係保護你唔好由小波段變成大鑊。學到嘅係：即使方向估錯，都要有離場位。`;
    case "stopped_then_target":
      return `同一段日子裏面，價錢既去過止損（${stop}）亦去過目標（${target}）。實際交易入面，止損單可能已經成交，之後先升——所以唔好事後話「早知唔好止損」。覆盤就係要接受呢種唔確定。`;
    case "not_triggered":
      return `價錢一直冇踏入買入區。呢個結果都好有用：唔係每個計劃都要做。等唔到回調，就唔好硬追，可以再等下一次。`;
    case "open":
      return `價錢入咗買入區，但到覆盤結束都未到目標，亦未止損。真實世界好多波段都係「等緊」。學到嘅係：有計劃之後，要有耐性。`;
  }
}

/**
 * Walk bars AFTER the as-of date. No look-ahead was used to build `plan`.
 */
export function evaluateReplay(plan: TradePlan, futureBars: Bar[]): ReplayResult {
  const events: ReplayEvent[] = [];
  const buyHigh = plan.buyHigh ?? plan.buy;
  const buyLow = plan.buyLow ?? plan.buy;
  const stop = plan.stop;
  const target = plan.target;

  if (!plan.actionable || buyHigh == null || buyLow == null || stop == null || target == null) {
    return {
      outcome: "not_triggered",
      entered: false,
      entryDate: null,
      events,
      lesson:
        "當日並冇一個值得跟嘅買入計劃（例如跌勢唔好追、或者風險回報唔夠）。覆盤教你：學會停手，同學會出手一樣重要。",
    };
  }

  let entered = false;
  let entryDate: string | null = null;
  let hitStop = false;
  let hitTarget = false;
  let stopDate: string | null = null;
  let targetDate: string | null = null;

  for (const bar of futureBars) {
    if (!entered) {
      const inZone = bar.low <= buyHigh && bar.high >= buyLow;
      if (inZone) {
        entered = true;
        entryDate = bar.date;
        const fill = Math.min(buyHigh, Math.max(buyLow, bar.low));
        events.push({ date: bar.date, kind: "entered", price: fill });
      } else {
        continue;
      }
    }

    const stopHit = bar.low <= stop;
    const targetHit = bar.high >= target;

    if (stopHit && targetHit) {
      hitStop = true;
      hitTarget = true;
      stopDate = bar.date;
      targetDate = bar.date;
      events.push({ date: bar.date, kind: "stop", price: stop });
      events.push({ date: bar.date, kind: "target", price: target });
      break;
    }
    if (stopHit) {
      hitStop = true;
      stopDate = bar.date;
      events.push({ date: bar.date, kind: "stop", price: stop });
      break;
    }
    if (targetHit) {
      hitTarget = true;
      targetDate = bar.date;
      events.push({ date: bar.date, kind: "target", price: target });
      break;
    }
  }

  let outcome: ReplayOutcome;
  if (!entered) outcome = "not_triggered";
  else if (hitStop && hitTarget && stopDate === targetDate) outcome = "stopped_then_target";
  else if (hitStop) outcome = "stopped";
  else if (hitTarget) outcome = "plan_hit";
  else outcome = "open";

  return {
    outcome,
    entered,
    entryDate,
    events,
    lesson: outcomeLesson(outcome, plan),
  };
}

export const OUTCOME_LABEL: Record<ReplayOutcome, string> = {
  plan_hit: "計劃成立",
  stopped: "止損",
  stopped_then_target: "先止損後才到目標",
  not_triggered: "未觸發",
  open: "未觸發",
};
