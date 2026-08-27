import Link from "next/link";
import { ExampleChips, SearchBox } from "@/components/search-box";
import { Disclaimer } from "@/components/disclaimer";
import { WatchList } from "@/components/watch-button";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:py-16">
      <p className="text-sm font-medium text-gold">畀未學過投資嘅人用</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight font-semibold tracking-tight text-pretty sm:text-5xl">
        一隻股票，
        <br />
        三個價。
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
        建議買入、目標賣出、止損。用幾個月嘅走勢同日常波動計出嚟，再用大白話講點解。唔使識睇圖，亦唔使寫程式。想用即時行情，去右上角連接
        Longbridge；唔連都得，會用延遲行情。
      </p>

      <div className="mt-8 space-y-4">
        <SearchBox large />
        <ExampleChips />
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        <Link
          href="/replay"
          className="rounded-2xl bg-card p-5 ring-1 ring-foreground/8 transition-colors hover:ring-gold/50"
        >
          <p className="text-sm text-gold">覆盤</p>
          <h2 className="mt-1 font-serif text-xl">用舊日子練習</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            假設你喺某日先見到圖，睇下之後係先到目標定先止損。唔使真錢。
          </p>
        </Link>
        <Link
          href="/help"
          className="rounded-2xl bg-card p-5 ring-1 ring-foreground/8 transition-colors hover:ring-gold/50"
        >
          <p className="text-sm text-gold">點用</p>
          <h2 className="mt-1 font-serif text-xl">五分鐘上手</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            搜尋、三個價、圖表開關、詞彙同覆盤，逐樣講。
          </p>
        </Link>
      </div>

      <div className="mt-10">
        <WatchList />
      </div>

      <div className="mt-auto pt-12">
        <Disclaimer />
      </div>
    </main>
  );
}
