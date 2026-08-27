import { StockError, StockView } from "@/components/stock-view";
import { getStockPayload } from "@/lib/stock";

export const dynamic = "force-dynamic";

export default async function StockPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const decoded = decodeURIComponent(ticker);
  try {
    const data = await getStockPayload(decoded);
    return <StockView data={data} />;
  } catch (err) {
    const message = err instanceof Error ? err.message : "暫時攞唔到行情，稍後再試。";
    return <StockError message={message} />;
  }
}
