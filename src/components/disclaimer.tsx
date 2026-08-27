import Link from "next/link";
import { cn } from "@/lib/utils";

export function Disclaimer({ className, compact = false }: { className?: string; compact?: boolean }) {
  if (compact) {
    return (
      <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
        不是投資建議，數字來自技術分位，只供學習。未連接時行情可能延遲。
      </p>
    );
  }
  return (
    <p className={cn("text-sm leading-relaxed text-muted-foreground", className)}>
      不是投資建議，數字來自技術分位，只供學習。
      呢度用公開嘅歷史價錢同成交量，唔係莊家消息，亦唔會幫你落單。
      未撳「連接 Longbridge」時用公開延遲行情；連上之後用即時報價同日K，仍然唔會幫你落單。
      想知每個詞彙點解，去{" "}
      <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
        詞彙
      </Link>
      。
    </p>
  );
}
