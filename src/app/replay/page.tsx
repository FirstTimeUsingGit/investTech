import { ReplayView } from "@/components/replay-view";
import { getStockPayload } from "@/lib/stock";
import type { StockPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReplayPage({
  searchParams,
}: {
  searchParams: Promise<{ ticker?: string; asOf?: string; end?: string }>;
}) {
  const sp = await searchParams;
  const ticker = typeof sp.ticker === "string" ? sp.ticker : undefined;
  const asOf = typeof sp.asOf === "string" ? sp.asOf : undefined;
  const initialReveal = sp.end === "1";
  let initialPayload: StockPayload | null = null;
  let initialError: string | null = null;
  if (ticker && asOf) {
    try {
      initialPayload = await getStockPayload(ticker, asOf);
    } catch (err) {
      initialError = err instanceof Error ? err.message : "覆盤載入失敗。";
    }
  }
  return (
    <ReplayView
      initialTicker={ticker}
      initialAsOf={asOf}
      initialPayload={initialPayload}
      initialError={initialError}
      initialReveal={initialReveal}
    />
  );
}
