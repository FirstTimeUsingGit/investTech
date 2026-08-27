export type Market = "HK" | "US";

export type Bar = {
  time: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Quote = {
  symbol: string;
  name: string;
  nameEn: string;
  currency: string;
  market: Market;
  exchange: string;
  price: number;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  marketCap: number | null;
  peTrailing: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  timezone: string;
  delayed: boolean;
  source: "yahoo" | "longbridge";
};

export type SearchHit = {
  symbol: string;
  name: string;
  nameEn: string;
  exchange: string;
  market: Market;
};

export type Trend = "up" | "down" | "sideways";

export type Stance =
  | "wait_pullback"
  | "near_buy"
  | "below_zone"
  | "do_not_chase"
  | "range_buy"
  | "breakdown"
  | "mean_reversion"
  | "no_trade";

export type Pivot = {
  index: number;
  date: string;
  price: number;
};

export type Level = {
  price: number;
  kind: "support" | "resistance";
  touches: number;
  lastDate: string;
};

export type IndicatorNote = {
  key: string;
  name: string;
  termId: string;
  value: string;
  meaning: string;
  effect: string;
};

export type TradePlan = {
  trend: Trend;
  stance: Stance;
  actionable: boolean;
  higherRisk: boolean;
  buy: number | null;
  buyLow: number | null;
  buyHigh: number | null;
  target: number | null;
  stop: number | null;
  rewardRisk: number | null;
  riskAmount: number | null;
  rewardAmount: number | null;
  headline: string;
  planSentence: string;
  whyNot: string | null;
  currentVsPlan: string;
  indicators: IndicatorNote[];
  supports: number[];
  resistances: number[];
  stats: {
    lastClose: number;
    lastDate: string;
    ma20: number | null;
    ma50: number | null;
    atr14: number | null;
    rsi14: number | null;
    swingLow: number | null;
    swingHigh: number | null;
    rangeLow: number | null;
    rangeHigh: number | null;
  };
};

export type ReplayOutcome =
  | "plan_hit"
  | "stopped"
  | "stopped_then_target"
  | "not_triggered"
  | "open";

export type ReplayEvent = {
  date: string;
  kind: "entered" | "target" | "stop";
  price: number;
};

export type ReplayResult = {
  outcome: ReplayOutcome;
  entered: boolean;
  entryDate: string | null;
  events: ReplayEvent[];
  lesson: string;
};

export type StockPayload = {
  quote: Quote;
  bars: Bar[];
  analysis: TradePlan;
  asOf: string;
  cutoffIndex: number;
};
