import type { Bar, IndicatorNote, Stance, TradePlan, Trend } from "./types";
import { lastAtr, lastRsi, lastSma } from "./indicators";
import { formatNumber, formatPrice, roundPrice } from "./format";
import {
  clusterPrices,
  findPivots,
  nearestAbove,
  nearestBelow,
  recentWindow,
} from "./swings";

const MIN_BARS = 60;
const STRUCTURE_DAYS = 126;
const RANGE_DAYS = 63;
const ATR_STOP_MULT = 1.75;
const MIN_RR = 1.5;
const TARGET_RR = 2;

function last<T>(arr: T[]): T {
  return arr[arr.length - 1];
}

function decideTrend(price: number, ma20: number, ma50: number): Trend {
  const spread = Math.abs(ma20 - ma50) / price;
  if (spread < 0.008 && price < Math.max(ma20, ma50) * 1.03 && price > Math.min(ma20, ma50) * 0.97) {
    return "sideways";
  }
  if (ma20 > ma50 && price > ma50) return "up";
  if (ma20 < ma50 && price < ma50) return "down";
  return "sideways";
}

function rr(buy: number, stop: number, target: number): number {
  const risk = buy - stop;
  if (risk <= 0) return 0;
  return (target - buy) / risk;
}

function note(
  key: string,
  name: string,
  termId: string,
  value: string,
  meaning: string,
  effect: string,
): IndicatorNote {
  return { key, name, termId, value, meaning, effect };
}

export function buildPlan(bars: Bar[], hint = 2): TradePlan {
  if (bars.length < MIN_BARS) {
    const lastBar = bars.length ? last(bars) : null;
    return emptyPlan(
      lastBar?.close ?? 0,
      lastBar?.date ?? "",
      "資料太少，未夠大約三個月日線，計唔到穩陣嘅波段位。換一隻上市耐啲嘅股票，或者遲啲再試。",
    );
  }

  const closes = bars.map((b) => b.close);
  const lastBar = last(bars);
  const price = lastBar.close;
  const ma20 = lastSma(closes, 20);
  const ma50 = lastSma(closes, 50);
  const atr14 = lastAtr(bars, 14);
  const rsi14 = lastRsi(closes, 14);

  if (ma20 == null || ma50 == null || atr14 == null || atr14 <= 0) {
    return emptyPlan(price, lastBar.date, "平均線或者波幅仲未企穩，暫時唔好用呢三個價。");
  }

  const structure = recentWindow(bars, STRUCTURE_DAYS);
  const rangeBars = recentWindow(bars, RANGE_DAYS);
  const { highs, lows } = findPivots(structure, 5, 5);
  const clusterTol = Math.max(atr14 * 0.45, price * 0.008);
  const supportClusters = clusterPrices(
    lows.map((p) => p.price),
    clusterTol,
  );
  const resistanceClusters = clusterPrices(
    highs.map((p) => p.price),
    clusterTol,
  );

  const recentLow =
    lows.length > 0
      ? lows.reduce((a, b) => (a.index > b.index ? a : b)).price
      : Math.min(...structure.map((b) => b.low));
  const recentHigh =
    highs.length > 0
      ? highs.reduce((a, b) => (a.index > b.index ? a : b)).price
      : Math.max(...structure.map((b) => b.high));

  const rangeLow = Math.min(...rangeBars.map((b) => b.low));
  const rangeHigh = Math.max(...rangeBars.map((b) => b.high));

  const supportLevels = supportClusters.map((c) => roundPrice(c.price, hint));
  const resistanceLevels = resistanceClusters.map((c) => roundPrice(c.price, hint));

  const primarySupport =
    nearestBelow(supportLevels, price) ??
    (recentLow < price ? roundPrice(recentLow, hint) : roundPrice(rangeLow, hint));
  const primaryResistance =
    nearestAbove(resistanceLevels, price) ??
    (recentHigh > price ? roundPrice(recentHigh, hint) : roundPrice(rangeHigh, hint));

  const trend = decideTrend(price, ma20, ma50);
  const rp = (n: number) => roundPrice(n, hint);

  const baseStats = {
    lastClose: price,
    lastDate: lastBar.date,
    ma20: rp(ma20),
    ma50: rp(ma50),
    atr14: rp(atr14),
    rsi14: rsi14 != null ? roundPrice(rsi14, 2) : null,
    swingLow: rp(recentLow),
    swingHigh: rp(recentHigh),
    rangeLow: rp(rangeLow),
    rangeHigh: rp(rangeHigh),
  };

  const commonNotes = (effects: Record<string, string>): IndicatorNote[] => [
    note(
      "ma20",
      "MA20",
      "ma20",
      formatPrice(rp(ma20)),
      "最近約一個月嘅平均收市價，反映短啲嘅節奏。",
      effects.ma20,
    ),
    note(
      "ma50",
      "MA50",
      "ma50",
      formatPrice(rp(ma50)),
      "最近約兩個半月嘅平均，用來判斷大方向。",
      effects.ma50,
    ),
    note(
      "swingLow",
      "最近波段低位",
      "support",
      formatPrice(rp(recentLow)),
      "近期一次明顯嘅「谷底」，常用嚟做支撑。",
      effects.swingLow,
    ),
    note(
      "swingHigh",
      "最近波段高位",
      "resistance",
      formatPrice(rp(recentHigh)),
      "近期一次明顯嘅「峰頂」，常用嚟做阻力。",
      effects.swingHigh,
    ),
    note(
      "atr",
      "ATR（14）",
      "atr",
      formatPrice(rp(atr14)),
      "最近大約兩週嘅日常波動，用來將止損放喺嘈音之外。",
      effects.atr,
    ),
  ];

  if (trend === "down") {
    const oversold =
      rsi14 != null &&
      rsi14 <= 32 &&
      price <= rangeLow + 0.6 * atr14;

    if (oversold) {
      const buyLow = rp(Math.max(rangeLow, price - 0.2 * atr14));
      const buyHigh = rp(Math.min(price, rangeLow + 0.4 * atr14));
      const buy = rp((buyLow + buyHigh) / 2);
      const stop = rp(Math.min(rangeLow, buy) - ATR_STOP_MULT * atr14);
      const bounceTarget = rp(Math.min(ma20, primaryResistance));
      const twoR = rp(buy + TARGET_RR * (buy - stop));
      const target = rp(Math.min(bounceTarget, twoR));
      const ratio = rr(buy, stop, target);

      if (buy > stop && ratio >= MIN_RR) {
        return finalize({
          trend,
          stance: "mean_reversion",
          actionable: true,
          higherRisk: true,
          buy,
          buyLow: Math.min(buyLow, buy),
          buyHigh: Math.max(buyHigh, buy),
          target,
          stop,
          headline: "較高風險：接近區間低位嘅反彈構想，並非抄底保證",
          planSentence: `而家係跌勢，正常唔應該追買。不過價錢已經挨近近三個月低位，RSI 亦偏低（${formatNumber(rsi14, 1)}），先標一個「均值回歸」試探：近 ${formatPrice(buy)} 先考慮，止損 ${formatPrice(stop)}，反彈目標 ${formatPrice(target)}。呢單風險高，輸咗要走。`,
          whyNot: null,
          currentVsPlan:
            price > buy
              ? "即使係高風險構想，都唔好現價追入，等佢挨近買入區。"
              : "現價已經接近呢個高風險買入區，記住：跌勢反彈隨時失敗。",
          indicators: [
            ...commonNotes({
              ma20: `20天線喺 ${formatPrice(rp(ma20))}，仍然低過 50 天線，所以大方向未轉好；反彈目標先睇呢條線附近。`,
              ma50: `50天線喺 ${formatPrice(rp(ma50))}，價錢喺佢下面，確認而家仲係跌勢。`,
              swingLow: `近期低位 ${formatPrice(rp(recentLow))} 變成呢次試探嘅參考支撑。`,
              swingHigh: `近期高位 ${formatPrice(rp(recentHigh))} 太遠，唔會當呢次目標。`,
              atr: `ATR ${formatPrice(rp(atr14))}，止損再向外推約 ${ATR_STOP_MULT} 倍，避免日常震盪掃走。`,
            }),
            note(
              "rsi",
              "RSI（14）",
              "rsi",
              formatNumber(rsi14, 1),
              "低過大約 30，代表最近跌得急，有機會彈一彈，但亦可以繼續跌。",
              "只係用嚟確認「可能超賣」，唔可以單獨當買入理由。",
            ),
          ],
          supports: uniqueLevels([primarySupport, rp(rangeLow), rp(recentLow)]),
          resistances: uniqueLevels([rp(ma20), primaryResistance]),
          stats: baseStats,
        });
      }
    }

    return finalize({
      trend,
      stance: "do_not_chase",
      actionable: false,
      higherRisk: false,
      buy: null,
      buyLow: null,
      buyHigh: null,
      target: primaryResistance,
      stop: primarySupport,
      headline: "現在不建議追買",
      planSentence: `20天線（${formatPrice(rp(ma20))}）低過 50天線（${formatPrice(rp(ma50))}），現價又喺 50天線下面，呢個係跌勢。跌勢裏面抄底好似接飛刀。而家唔好追買；如果價錢之後升返上 ${formatPrice(primaryResistance)} 一帶，先再睇趨勢有冇轉。下面 ${formatPrice(primarySupport)} 係支撑觀察位，跌穿就可能再弱。`,
      whyNot: "跌勢不建議追買。下面顯示嘅係觀察／失效位，並非入場價。",
      currentVsPlan: "現在不建議追買。想學點判斷，可以用覆盤睇舊例子。",
      indicators: commonNotes({
        ma20: `20天線 ${formatPrice(rp(ma20))} 低過 50天線，短線都未轉好，所以唔會用佢當買入理由。`,
        ma50: `50天線 ${formatPrice(rp(ma50))} 好似一條大方向。現價喺下面，當跌勢處理。`,
        swingLow: `最近低位 ${formatPrice(rp(recentLow))} 係下方觀察支撑，並非「抵買」保證。`,
        swingHigh: `最近高位 ${formatPrice(rp(recentHigh))} 附近嘅阻力，用作「升穿先再傾」嘅觀察位。`,
        atr: `ATR ${formatPrice(rp(atr14))} 告訴你日常會震幾多；跌勢裏面波動可以突然放大，更加唔好空手接。`,
      }),
      supports: uniqueLevels([primarySupport, rp(recentLow)]),
      resistances: uniqueLevels([primaryResistance, rp(ma50), rp(recentHigh)]),
      stats: baseStats,
    });
  }

  if (trend === "sideways") {
    const buyLow = rp(rangeLow);
    const buyHigh = rp(Math.min(rangeLow + 0.45 * atr14, (rangeLow + rangeHigh) / 2));
    const buy = rp((buyLow + Math.min(buyHigh, buyLow + 0.3 * atr14)) / 2);
    const stop = rp(rangeLow - 1.35 * atr14);
    const targetFromRange = rp(rangeHigh - 0.15 * atr14);
    const twoR = rp(buy + TARGET_RR * (buy - stop));
    const target = rp(Math.min(targetFromRange, twoR));
    const ratio = rr(buy, stop, target);
    const rangeWidth = rangeHigh - rangeLow;

    if (rangeWidth < 2.2 * atr14 || ratio < MIN_RR || buy <= stop) {
      return finalize({
        trend,
        stance: "no_trade",
        actionable: false,
        higherRisk: false,
        buy: null,
        buyLow: null,
        buyHigh: null,
        target: rp(rangeHigh),
        stop: rp(rangeLow),
        headline: "橫行，但區間太窄或者風險回報不夠",
        planSentence: `近三個月價錢喺 ${formatPrice(rp(rangeLow))} 至 ${formatPrice(rp(rangeHigh))} 附近上落，但區間相對 ATR（${formatPrice(rp(atr14))}）唔夠闊，或者目標唔夠遠。硬做嘅話，止損一掃就蝕，目標又好近，所以今次唔建議開新倉。`,
        whyNot: "橫行區間的風險回報低過約 1.5:1，唔會硬砌一個交易。",
        currentVsPlan: "而家唔使執著三個價。等區間再走闊，或者趨勢再清晰。",
        indicators: commonNotes({
          ma20: `20天線 ${formatPrice(rp(ma20))} 同 50天線糾纏，確認而家唔係單邊市。`,
          ma50: `50天線 ${formatPrice(rp(ma50))} 走平，大方向未決。`,
          swingLow: `波段低位 ${formatPrice(rp(recentLow))} 同區間底接近。`,
          swingHigh: `波段高位 ${formatPrice(rp(recentHigh))} 同區間頂接近。`,
          atr: `ATR ${formatPrice(rp(atr14))} 相對區間唔細，代表嘈音可以食晒你想賺嘅位。`,
        }),
        supports: uniqueLevels([rp(rangeLow), primarySupport]),
        resistances: uniqueLevels([rp(rangeHigh), primaryResistance]),
        stats: baseStats,
      });
    }

    const stance: Stance =
      price > buyHigh ? "wait_pullback" : price >= buyLow ? "range_buy" : "below_zone";

    return finalize({
      trend,
      stance,
      actionable: true,
      higherRisk: false,
      buy,
      buyLow,
      buyHigh: Math.max(buyHigh, buy),
      target,
      stop,
      headline: "橫行：近區間支撑先考慮，近阻力就減",
      planSentence: `近三個月好似一條走廊，底大約 ${formatPrice(rp(rangeLow))}，頂大約 ${formatPrice(rp(rangeHigh))}。波段做法好簡單：挨近底部（建議買入 ${formatPrice(buy)}）先考慮，目標睇走廊頂附近 ${formatPrice(target)}，止損放喺走廊外面 ${formatPrice(stop)}。`,
      whyNot: null,
      currentVsPlan: vsPlanText(price, buyLow, Math.max(buyHigh, buy), stop, "range"),
      indicators: commonNotes({
        ma20: `20天線 ${formatPrice(rp(ma20))} 走喺區間中間附近，唔會用佢追突破。`,
        ma50: `50天線 ${formatPrice(rp(ma50))} 都冇明顯斜度，所以當橫行處理。`,
        swingLow: `波段低位 ${formatPrice(rp(recentLow))} 幫手確認走廊底部。`,
        swingHigh: `波段高位 ${formatPrice(rp(recentHigh))} 變成賣出／目標參考。`,
        atr: `ATR ${formatPrice(rp(atr14))}，止損要離開區間底大約 1.3 倍，避免假跌破。`,
      }),
      supports: uniqueLevels([rp(rangeLow), primarySupport]),
      resistances: uniqueLevels([rp(rangeHigh), primaryResistance]),
      stats: baseStats,
    });
  }

  // Uptrend
  if (price < primarySupport - 0.55 * atr14) {
    return finalize({
      trend,
      stance: "breakdown",
      actionable: false,
      higherRisk: false,
      buy: null,
      buyLow: null,
      buyHigh: null,
      target: rp(ma20),
      stop: rp(primarySupport),
      headline: "升勢可能已破支撑，先不要抄",
      planSentence: `平均線仍然偏升，但現價已經跌穿近期支撑 ${formatPrice(primarySupport)} 一截。呢種時候最易覺得「平咗好抵」，但其實可能轉弱。而家唔建議買；要等價錢重新企返上支撑，或者走穩一段。`,
      whyNot: "現價低過支撑，計劃失效，唔好當打折貨。",
      currentVsPlan: "計劃暫時失效。跌穿支撑之後，舊支撑可以變成阻力。",
      indicators: commonNotes({
        ma20: `20天線 ${formatPrice(rp(ma20))} 仍高過 50天線，所以圖表仲有升勢影子，但價格已經離開。`,
        ma50: `50天線 ${formatPrice(rp(ma50))} 係大方向；如果連呢條都跌穿，更加唔好動手。`,
        swingLow: `支撑 ${formatPrice(primarySupport)} 已失守，所以唔會再用呢個位做買入。`,
        swingHigh: `高位 ${formatPrice(rp(recentHigh))} 而家只係遠方阻力。`,
        atr: `ATR ${formatPrice(rp(atr14))} 用來量「跌咗幾遠先算破位」，而家已經超過半個 ATR。`,
      }),
      supports: uniqueLevels([primarySupport, rp(recentLow)]),
      resistances: uniqueLevels([rp(ma20), primaryResistance]),
      stats: baseStats,
    });
  }

  const pullbackCap = Math.min(ma20, price);
  let buyHigh = rp(Math.max(primarySupport, Math.min(pullbackCap, primarySupport + 0.8 * atr14)));
  let buyLow = rp(primarySupport);
  if (buyHigh <= buyLow) buyHigh = rp(buyLow + 0.25 * atr14);
  let buy = rp((buyLow + buyHigh) / 2);

  let stop = rp(Math.min(recentLow, buyLow) - ATR_STOP_MULT * atr14);
  if (buy - stop < 1.5 * atr14) {
    stop = rp(buy - ATR_STOP_MULT * atr14);
  }
  if (stop >= buy) {
    stop = rp(buy - ATR_STOP_MULT * atr14);
  }

  const twoR = rp(buy + TARGET_RR * (buy - stop));
  const resistanceTarget = primaryResistance > buy ? primaryResistance : rp(recentHigh);
  const conservative = rp(Math.min(resistanceTarget, twoR));
  const ratio = rr(buy, stop, conservative);

  if (ratio < MIN_RR) {
    return finalize({
      trend,
      stance: "no_trade",
      actionable: false,
      higherRisk: false,
      buy,
      buyLow,
      buyHigh,
      target: conservative,
      stop,
      headline: "升勢，但到下一個阻力嘅風險回報不夠",
      planSentence: `雖然大方向偏升，但由買入區 ${formatPrice(buy)} 上到下一個阻力 ${formatPrice(conservative)}，相對止損 ${formatPrice(stop)} 嘅距離唔夠（只有大約 ${formatNumber(ratio, 2)}:1）。我哋唔會為咗「有三個價」而硬推你入場。`,
      whyNot: `風險回報只有大約 ${formatNumber(ratio, 2)}:1，低過約 1.5:1，所以不建議做。`,
      currentVsPlan: vsPlanText(price, buyLow, buyHigh, stop, "up"),
      indicators: commonNotes({
        ma20: `20天線 ${formatPrice(rp(ma20))} 提供回調參考，但目標空間被阻力卡住。`,
        ma50: `50天線 ${formatPrice(rp(ma50))} 確認升勢仲喺。`,
        swingLow: `支撑／低位 ${formatPrice(rp(recentLow))} 用來放止損。`,
        swingHigh: `下一個阻力 ${formatPrice(resistanceTarget)} 太近，賺唔過要冒嘅險。`,
        atr: `ATR ${formatPrice(rp(atr14))} 令止損要放得夠遠，更加壓縮咗回報。`,
      }),
      supports: uniqueLevels([primarySupport, buyLow]),
      resistances: uniqueLevels([resistanceTarget, rp(recentHigh)]),
      stats: baseStats,
    });
  }

  const stance: Stance =
    price > buyHigh * 1.005 ? "wait_pullback" : price >= buyLow ? "near_buy" : "below_zone";

  return finalize({
    trend,
    stance,
    actionable: true,
    higherRisk: false,
    buy,
    buyLow,
    buyHigh,
    target: conservative,
    stop,
    headline:
      stance === "wait_pullback"
        ? "升勢：等回調近買入區，不要現價追入"
        : "升勢：現價接近買入區",
    planSentence: `20天線（${formatPrice(rp(ma20))}）喺 50天線（${formatPrice(rp(ma50))}）上面，現價亦企穩喺 50天之上，所以當升勢。波段做法係等回調近支撑／20天線一帶，建議買入價 ${formatPrice(buy)}。止損放喺最近低位再加約 ${ATR_STOP_MULT} 倍 ATR，即 ${formatPrice(stop)}，避免日常上落把你掃走。目標取下一個阻力同大約 2:1 回報之中較近嗰個，即 ${formatPrice(conservative)}。`,
    whyNot: null,
    currentVsPlan: vsPlanText(price, buyLow, buyHigh, stop, "up"),
    indicators: commonNotes({
      ma20: `20天線 ${formatPrice(rp(ma20))} 係回調時第一條「透氣線」，買入區挨近佢。`,
      ma50: `50天線 ${formatPrice(rp(ma50))} 確認大方向向上；升勢先至考慮等回調買。`,
      swingLow: `最近波段低位 ${formatPrice(rp(recentLow))} 決定止損要放喺邊；止損喺佢下面再加 ATR。`,
      swingHigh: `最近波段高位／阻力 ${formatPrice(resistanceTarget)} 限制目標，我哋揀保守嗰個，唔會幻想無限升。`,
      atr: `ATR ${formatPrice(rp(atr14))} × ${ATR_STOP_MULT} 加喺低位之外，令止損唔好貼得太近。`,
    }),
    supports: uniqueLevels([primarySupport, buyLow, rp(recentLow)]),
    resistances: uniqueLevels([conservative, resistanceTarget, rp(recentHigh)]),
    stats: baseStats,
  });
}

function uniqueLevels(xs: Array<number | null | undefined>): number[] {
  const out: number[] = [];
  for (const x of xs) {
    if (x == null || !Number.isFinite(x)) continue;
    if (out.some((y) => Math.abs(y - x) / x < 0.004)) continue;
    out.push(x);
  }
  return out.slice(0, 4);
}

function vsPlanText(
  price: number,
  buyLow: number,
  buyHigh: number,
  stop: number,
  mode: "up" | "range",
): string {
  if (price <= stop) {
    return "現價已低過止損，呢個計劃失效，唔好當平貨執。";
  }
  if (price > buyHigh) {
    return mode === "range"
      ? "現價高過買入區，等佢跌返近區間底部，唔好走廊中間追入。"
      : "現價高過買入區，等回調，不要現價追入。";
  }
  if (price >= buyLow && price <= buyHigh) {
    return "現價已經落入買入區附近。記住仲未係「一定要買」，只係計劃話呢一帶先合理。";
  }
  return "現價低過買入區但仍高過止損，小心係咪已經轉弱，唔好因為平咗就加注。";
}

function emptyPlan(price: number, date: string, why: string): TradePlan {
  return {
    trend: "sideways",
    stance: "no_trade",
    actionable: false,
    higherRisk: false,
    buy: null,
    buyLow: null,
    buyHigh: null,
    target: null,
    stop: null,
    rewardRisk: null,
    riskAmount: null,
    rewardAmount: null,
    headline: "暫時計唔到",
    planSentence: why,
    whyNot: why,
    currentVsPlan: why,
    indicators: [],
    supports: [],
    resistances: [],
    stats: {
      lastClose: price,
      lastDate: date,
      ma20: null,
      ma50: null,
      atr14: null,
      rsi14: null,
      swingLow: null,
      swingHigh: null,
      rangeLow: null,
      rangeHigh: null,
    },
  };
}

function finalize(
  partial: Omit<TradePlan, "rewardRisk" | "riskAmount" | "rewardAmount">,
): TradePlan {
  const { buy, stop, target } = partial;
  let rewardRisk: number | null = null;
  let riskAmount: number | null = null;
  let rewardAmount: number | null = null;
  if (buy != null && stop != null && target != null && buy > stop) {
    riskAmount = roundPrice(buy - stop, 4);
    rewardAmount = roundPrice(target - buy, 4);
    rewardRisk = roundPrice(rewardAmount / riskAmount, 2);
  }
  if (partial.actionable && (buy == null || stop == null || buy <= stop)) {
    return {
      ...partial,
      actionable: false,
      stance: "no_trade",
      headline: "數字唔合理，已取消買入建議",
      whyNot: "計算出現買入價不高於止損嘅情況，系統拒絕輸出交易。",
      rewardRisk,
      riskAmount,
      rewardAmount,
    };
  }
  return { ...partial, rewardRisk, riskAmount, rewardAmount };
}
