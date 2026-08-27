"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Status = { connected: boolean };

export function ConnectLongbridge() {
  const pathname = usePathname();
  const [status, setStatus] = React.useState<Status | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [flash, setFlash] = React.useState<string | null>(null);
  const [returnTo, setReturnTo] = React.useState(pathname);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lb = params.get("lb");
    if (lb === "connected") setFlash("已連接 Longbridge，用緊即時行情。");
    if (lb === "error") setFlash(params.get("msg") || "連接失敗，繼續用延遲行情。");
    params.delete("lb");
    params.delete("msg");
    const qs = params.toString();
    setReturnTo(`${pathname}${qs ? `?${qs}` : ""}`);
    if (!lb) return;
    const t = window.setTimeout(() => setFlash(null), 7000);
    return () => window.clearTimeout(t);
  }, [pathname]);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/longbridge/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: Status) => {
        if (!cancelled) setStatus({ connected: Boolean(j.connected) });
      })
      .catch(() => {
        if (!cancelled) setStatus({ connected: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function disconnect() {
    setBusy(true);
    try {
      await fetch("/api/longbridge/disconnect", { method: "POST" });
      setStatus({ connected: false });
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  const connected = status?.connected === true;

  return (
    <div className="flex items-center gap-2">
      {flash ? (
        <span className="hidden max-w-[16rem] truncate text-xs text-muted-foreground xl:inline">
          {flash}
        </span>
      ) : null}
      {connected ? (
        <Popover>
          <PopoverTrigger className="inline-flex h-7 items-center rounded-lg border border-border bg-background px-2.5 text-xs hover:bg-muted sm:text-sm">
            已連接 · 即時
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64">
            <p className="text-sm leading-relaxed">
              而家用 Longbridge 即時港股／美股報價同日K，計三個價。美股現價會跟盤前、盤中、盤後同夜盤最新一筆。呢個
              app 唔會睇戶口、亦唔會幫你落單。
            </p>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void disconnect()}>
              解除連接
            </Button>
          </PopoverContent>
        </Popover>
      ) : (
        <Button variant="outline" size="sm" className="text-xs sm:text-sm" asChild>
          <a href={`/api/longbridge/connect?returnTo=${encodeURIComponent(returnTo)}`}>
            連接 Longbridge
          </a>
        </Button>
      )}
    </div>
  );
}
