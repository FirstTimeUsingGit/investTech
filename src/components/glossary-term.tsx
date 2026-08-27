"use client";

import * as React from "react";
import { TERMS, TERM_MAP, type Term } from "@/lib/glossary";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Ctx = {
  openTerm: (id: string) => void;
};

const GlossaryContext = React.createContext<Ctx>({ openTerm: () => {} });

export function GlossaryProvider({ children }: { children: React.ReactNode }) {
  const [id, setId] = React.useState<string | null>(null);
  const term: Term | undefined = id ? TERM_MAP[id] : undefined;

  return (
    <GlossaryContext.Provider value={{ openTerm: setId }}>
      {children}
      <Dialog open={!!term} onOpenChange={(o) => !o && setId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">{term?.title}</DialogTitle>
            <DialogDescription className="text-base leading-relaxed text-foreground/85">
              {term?.body}
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">不是投資建議，數字來自技術分位，只供學習。</p>
        </DialogContent>
      </Dialog>
    </GlossaryContext.Provider>
  );
}

export function useGlossary() {
  return React.useContext(GlossaryContext);
}

export function GlossaryTerm({
  id,
  children,
  className,
}: {
  id: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { openTerm } = useGlossary();
  const term = TERM_MAP[id] ?? TERMS.find((t) => t.id === id);
  if (!term) return <>{children}</>;
  return (
    <a
      href={`/terms#${id}`}
      onClick={(e) => {
        e.preventDefault();
        openTerm(id);
      }}
      className={cn(
        "cursor-help rounded-[4px] border-b border-dotted border-gold/80 px-0.5 font-medium text-foreground decoration-gold underline-offset-4 hover:bg-gold/10",
        className,
      )}
      aria-label={`解釋：${term.label}`}
    >
      {children ?? term.label}
    </a>
  );
}
