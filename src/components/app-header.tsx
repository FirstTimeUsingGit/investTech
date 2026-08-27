import Link from "next/link";
import { ConnectLongbridge } from "@/components/connect-longbridge";

const links = [
  { href: "/", label: "搜尋" },
  { href: "/replay", label: "覆盤" },
  { href: "/help", label: "點用" },
  { href: "/terms", label: "詞彙" },
];

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-serif text-xl font-semibold tracking-tight">三個價</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">買入 · 目標 · 止損</span>
        </Link>
        <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-2">
          <nav className="flex items-center gap-0.5 text-xs sm:gap-1 sm:text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full px-1.5 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:px-2.5"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <ConnectLongbridge />
        </div>
      </div>
    </header>
  );
}
