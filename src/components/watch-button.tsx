"use client";

import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWatchlist, isWatched, toggleWatch, type WatchItem } from "@/lib/storage";
import * as React from "react";

export function WatchButton({ symbol, name }: { symbol: string; name: string }) {
  const [on, setOn] = React.useState(false);

  React.useEffect(() => {
    setOn(isWatched(symbol));
  }, [symbol]);

  return (
    <Button
      type="button"
      variant={on ? "secondary" : "outline"}
      onClick={() => {
        const next = toggleWatch({ symbol, name, addedAt: new Date().toISOString() });
        setOn(next.some((x) => x.symbol === symbol));
      }}
    >
      <Star className={on ? "fill-gold text-gold" : ""} />
      {on ? "已加入觀察" : "加入觀察名單"}
    </Button>
  );
}

export function WatchList() {
  const [items, setItems] = React.useState<WatchItem[]>([]);
  React.useEffect(() => {
    setItems(getWatchlist());
    function onStorage() {
      setItems(getWatchlist());
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onStorage);
    };
  }, []);

  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">你嘅觀察名單</h2>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <a
            key={item.symbol}
            href={`/stock/${encodeURIComponent(item.symbol)}`}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-gold"
          >
            {item.symbol} {item.name}
          </a>
        ))}
      </div>
    </div>
  );
}
