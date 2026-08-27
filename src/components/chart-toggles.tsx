"use client";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type ChartOverlays = {
  ma20: boolean;
  ma50: boolean;
  sr: boolean;
  plan: boolean;
  atr: boolean;
  rsi: boolean;
};

export const DEFAULT_OVERLAYS: ChartOverlays = {
  ma20: true,
  ma50: true,
  sr: true,
  plan: true,
  atr: false,
  rsi: false,
};

const ITEMS: { key: keyof ChartOverlays; label: string; hint?: string }[] = [
  { key: "ma20", label: "MA20" },
  { key: "ma50", label: "MA50" },
  { key: "sr", label: "支撑／阻力" },
  { key: "plan", label: "買入／目標／止損" },
  { key: "atr", label: "ATR 帶", hint: "可選" },
  { key: "rsi", label: "RSI", hint: "可選" },
];

export function ChartToggles({
  value,
  onChange,
}: {
  value: ChartOverlays;
  onChange: (next: ChartOverlays) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {ITEMS.map((item) => (
        <label key={item.key} className="flex items-center gap-2 text-sm">
          <Switch
            size="sm"
            checked={value[item.key]}
            onCheckedChange={(c) => onChange({ ...value, [item.key]: c })}
          />
          <span className={cn(item.hint && "text-muted-foreground")}>
            {item.label}
            {item.hint ? <span className="ml-1 text-xs">({item.hint})</span> : null}
          </span>
        </label>
      ))}
    </div>
  );
}
