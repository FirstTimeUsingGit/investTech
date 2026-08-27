const HK_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Hong_Kong",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function unixToDate(unix: number, timeZone = "Asia/Hong_Kong"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(unix * 1000));
}

export function todayHk(): string {
  return HK_DATE.format(new Date());
}

export function priceDecimals(price: number, hint = 2): number {
  if (!Number.isFinite(price)) return hint;
  if (price >= 1000) return Math.min(hint, 1);
  if (price >= 10) return 2;
  if (price >= 1) return 3;
  return 4;
}

export function roundPrice(price: number, hint = 2): number {
  const d = priceDecimals(price, hint);
  const f = 10 ** d;
  return Math.round(price * f) / f;
}

export function formatPrice(price: number | null | undefined, currency?: string): string {
  if (price == null || !Number.isFinite(price)) return "—";
  const d = priceDecimals(price);
  const n = price.toLocaleString("en-HK", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
  if (!currency) return n;
  if (currency === "HKD") return `HK$${n}`;
  if (currency === "USD") return `US$${n}`;
  return `${n} ${currency}`;
}

export function formatNumber(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-HK", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function formatCompact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(2)} 萬億`;
  if (abs >= 1e8) return `${(n / 1e8).toFixed(2)} 億`;
  if (abs >= 1e4) return `${(n / 1e4).toFixed(2)} 萬`;
  return n.toLocaleString("en-HK");
}

export function formatDateZh(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${y}年${Number(m)}月${Number(d)}日`;
}

export function formatQuoteTime(unix: number, timeZone: string): string {
  if (!unix) return "";
  return new Intl.DateTimeFormat("zh-HK", {
    timeZone,
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(unix * 1000));
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
