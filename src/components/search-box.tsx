"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EXAMPLE_TICKERS, normalizeTicker } from "@/lib/ticker";
import type { SearchHit } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SearchBox({
  large = false,
  initial = "",
  onSubmit,
  submitLabel = "睇三個價",
  inputName = "q",
  formAction = "/go",
  embedded = false,
}: {
  large?: boolean;
  initial?: string;
  onSubmit?: (symbol: string) => void;
  submitLabel?: string;
  inputName?: string;
  formAction?: string;
  embedded?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = React.useState(initial);
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const boxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 1) {
        setHits([]);
        return;
      }
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        const json = (await res.json()) as { hits?: SearchHit[] };
        setHits(json.hits ?? []);
      } catch {
        setHits([]);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function go(raw: string) {
    const parsed = normalizeTicker(raw);
    if ("error" in parsed) {
      setError(parsed.error);
      return false;
    }
    setError(null);
    setOpen(false);
    if (onSubmit) {
      onSubmit(parsed.symbol);
      setQ(parsed.symbol);
      return true;
    }
    router.push(`/stock/${encodeURIComponent(parsed.symbol)}`);
    return true;
  }

  const fields = (
    <>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name={inputName}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setError(null);
          }}
          onFocus={() => setOpen(true)}
          placeholder="輸入 700、0700.HK 或者 AAPL"
          aria-label="搜尋股票"
          className={cn(
            "bg-card pl-9",
            large ? "h-12 rounded-2xl text-base md:text-lg" : "h-10 rounded-xl",
          )}
          autoComplete="off"
        />
      </div>
      <Button
        type="submit"
        size={large ? "lg" : "default"}
        className={large ? "h-12 rounded-2xl px-5" : ""}
      >
        {submitLabel}
      </Button>
    </>
  );

  const body = (
    <div ref={boxRef} className="relative w-full">
      {embedded ? (
        <div className="flex gap-2">{fields}</div>
      ) : (
        <form
          action={formAction}
          method="get"
          onSubmit={(e) => {
            const parsed = normalizeTicker(q);
            if ("error" in parsed) {
              e.preventDefault();
              setError(parsed.error);
              return;
            }
            if (onSubmit) {
              e.preventDefault();
              go(q);
              return;
            }
            e.preventDefault();
            go(q);
          }}
          className="flex gap-2"
        >
          {fields}
        </form>
      )}
      {error && <p className="mt-2 text-sm text-stop">{error}</p>}
      {open && hits.length > 0 && (
        <ul className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl bg-popover ring-1 ring-foreground/10">
          {hits.map((h) => (
            <li key={h.symbol}>
              {embedded || onSubmit ? (
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-accent"
                  onClick={() => {
                    setQ(h.symbol);
                    go(h.symbol);
                    if (embedded) {
                      boxRef.current?.closest("form")?.requestSubmit();
                    }
                  }}
                >
                  <HitLabel hit={h} />
                </button>
              ) : (
                <Link
                  href={`/stock/${encodeURIComponent(h.symbol)}`}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-accent"
                  onClick={() => setOpen(false)}
                >
                  <HitLabel hit={h} />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return body;
}

function HitLabel({ hit }: { hit: SearchHit }) {
  return (
    <>
      <span>
        <span className="font-medium">{hit.symbol}</span>
        <span className="ml-2 text-muted-foreground">{hit.name}</span>
      </span>
      <span className="text-xs text-muted-foreground">{hit.market === "HK" ? "港股" : "美股"}</span>
    </>
  );
}

export function ExampleChips() {
  return (
    <div className="flex flex-wrap gap-2">
      {EXAMPLE_TICKERS.map((t) => (
        <Link
          key={t.symbol}
          href={`/stock/${encodeURIComponent(t.symbol)}`}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-gold hover:bg-accent"
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
