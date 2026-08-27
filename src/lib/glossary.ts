export type Term = {
  id: string;
  label: string;
  aliases: string[];
  title: string;
  body: string;
};

export const TERMS: Term[] = [
  {
    id: "swing",
    label: "波段",
    aliases: ["波段交易", "swing"],
    title: "波段（Swing）",
    body: "唔係今日買明日賣，亦唔係拿住幾年唔放。波段通常拿幾個星期，等一次較明顯嘅升或者跌行完。呢個 app 就係用呢個時間尺度嚟計三個價。",
  },
  {
    id: "support",
    label: "支撑",
    aliases: ["支撐", "支撑位"],
    title: "支撑",
    body: "可以想像成樓底。價錢跌到呢一帶，以前曾經有人願意買，所以容易停一停、甚至反彈。唔代表一定唔會跌穿——跌穿就可能變阻力。",
  },
  {
    id: "resistance",
    label: "阻力",
    aliases: ["阻力位"],
    title: "阻力",
    body: "可以想像成天花板。價錢升到呢一帶，以前有人賣過，所以容易滯住。升穿之後，舊阻力有時會變成新支撑。",
  },
  {
    id: "stop",
    label: "止損",
    aliases: ["止蝕", "stop-loss", "stop"],
    title: "止損",
    body: "預先講好：如果價錢跌到呢度，就承認呢次估錯，先走。目的唔係「賺最多」，而係「錯嘅時候唔好傷得太重」。止損要放喺日常嘈音之外，否則好易被掃走。",
  },
  {
    id: "atr",
    label: "ATR",
    aliases: ["平均真實波幅", "atr14"],
    title: "ATR（平均真實波幅）",
    body: "量度呢隻股「日常會震幾多」。數字大即係波動大。我哋用 14 日 ATR，將止損放喺大約 1.5 至 2 倍波幅之外，避免正常上落當你止損。",
  },
  {
    id: "ma20",
    label: "MA20",
    aliases: ["20天線", "20日平均", "二十天"],
    title: "MA20（20日平均線）",
    body: "最近約一個月收市價嘅平均。升勢裏面，價錢好多時會回調近呢條線。佢反應快，適合睇短啲嘅波段節奏。",
  },
  {
    id: "ma50",
    label: "MA50",
    aliases: ["50天線", "50日平均", "五十天"],
    title: "MA50（50日平均線）",
    body: "最近約兩個半月嘅平均，節奏慢啲。如果 20 天線喺 50 天線上面、價錢又企穩喺 50 天之上，我哋當佢偏升勢；掉轉就偏跌勢。",
  },
  {
    id: "rsi",
    label: "RSI",
    aliases: ["相對強弱指數"],
    title: "RSI（相對強弱）",
    body: "用 0 到 100 睇最近升跌係咪過熱。大約 70 以上叫偏強／超買，30 以下叫偏弱／超賣。呢個 app 預設唔畫 RSI，免得圖表太亂；只會喺少數「高風險均值回歸」先用佢幫手。",
  },
  {
    id: "pe",
    label: "P/E",
    aliases: ["市盈率", "pe"],
    title: "P/E（市盈率）",
    body: "股價除以每股盈利，粗略講「而家價錢相當於幾年盈利」。高唔等於貴，低亦唔等於平，要同同行、同自己歷史比。呢個 app 嘅三個價唔靠 P/E 計，只係旁邊俾你參考。",
  },
  {
    id: "buy-zone",
    label: "買入區",
    aliases: ["建議買入價", "入場"],
    title: "買入區",
    body: "一個價錢範圍，唔係「而家立刻按下去」。如果現價已經高過呢個區，正確做法係等回調，而唔係追入。",
  },
  {
    id: "target",
    label: "目標賣出價",
    aliases: ["目標", "止盈", "take profit"],
    title: "目標賣出價",
    body: "如果計劃順利，預期可以賣嘅位置。通常睇下一個阻力，或者風險回報大約 2:1，再揀保守嗰個（即係近啲嗰個）。",
  },
  {
    id: "rr",
    label: "風險回報",
    aliases: ["盈虧比", "reward:risk", "R:R"],
    title: "風險回報（Reward : Risk）",
    body: "潛在賺幾多，對比潛在蝕幾多。例如買 100、止損 90、目標 120，就係賺 20 對蝕 10，即 2:1。低過大約 1.5:1，我哋寧願唔做，唔好為咗「有動作」而硬開倉。",
  },
  {
    id: "pullback",
    label: "回調",
    aliases: ["等回調", "pullback"],
    title: "回調",
    body: "升勢裏面一次暫時跌返落嚟。好似走上樓時停低層透氣。等回調入場，係為咗唔好喺最貴嗰陣追。",
  },
  {
    id: "trend",
    label: "趨勢",
    aliases: ["升勢", "跌勢", "橫行"],
    title: "趨勢",
    body: "價錢整體向邊行。我哋用 20／50 天平均線幫手：升勢傾向等回調先買；跌勢唔好抄底；橫行就近區間低位買、高位賣。",
  },
  {
    id: "invalidation",
    label: "失效位",
    aliases: ["觀察位", "invalidation"],
    title: "失效位／觀察位",
    body: "如果價錢去到呢度，原本嘅判斷就唔成立。跌勢裏面我哋唔會亂俾「抄底價」，而會標阻力同支撑做觀察，等市場自己證明。",
  },
  {
    id: "session",
    label: "交易時段",
    aliases: ["盤前", "盤中", "盤後", "夜盤"],
    title: "盤前／盤中／盤後／夜盤",
    body: "美股唔止日間開市。連接 Longbridge 之後，現價會跟住而家最新嘅時段：盤前（開市前）、盤中（正規交易）、盤後（收市後）、夜盤（更加夜嗰段）。三個價仍然用日間日K 計，唔會將夜盤成交混入平均線。港股冇盤前同夜盤，收市之後見到嘅就係上一次盤中價。未連接時用延遲盤中價。",
  },
];

export const TERM_MAP = Object.fromEntries(TERMS.map((t) => [t.id, t])) as Record<
  string,
  Term
>;

export function findTerm(id: string): Term | undefined {
  return TERM_MAP[id];
}
