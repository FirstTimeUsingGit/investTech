import type { Metadata, Viewport } from "next";
import { Noto_Sans_TC, Noto_Serif_TC } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlossaryProvider } from "@/components/glossary-term";
import { AppHeader } from "@/components/app-header";
import "./globals.css";

const sans = Noto_Sans_TC({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const serif = Noto_Serif_TC({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "三個價 — 買入、目標、止損",
    template: "%s · 三個價",
  },
  description:
    "畀完全新手睇嘅波段功課：一隻股票，三個價。用公開行情計建議買入、目標同止損，並用日常廣東話解釋點解。",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#f3efe6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-Hant-HK"
      className={`${sans.variable} ${serif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <TooltipProvider delayDuration={200}>
          <GlossaryProvider>
            <AppHeader />
            <div className="flex flex-1 flex-col">{children}</div>
          </GlossaryProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
