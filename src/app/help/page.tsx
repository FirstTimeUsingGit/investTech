import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";

export const metadata = {
  title: "點用",
};

export default function HelpPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 pb-16">
      <h1 className="font-serif text-4xl font-semibold tracking-tight">點用三個價</h1>
      <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
        你唔使識投資，亦唔使識寫程式。打開瀏覽器，打股票代號就得。
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="font-serif text-2xl">1. 搜尋</h2>
        <p className="leading-relaxed">
          港股同美股用同一個框。打 700、0700、0700.HK 都係騰訊；美股打 AAPL 就係蘋果。主頁有現成按鈕：0700.HK、9988.HK、AAPL、TSLA。
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-serif text-2xl">2. 三個價</h2>
        <p className="leading-relaxed">
          最大嗰三個數字就係全部重點：建議買入價、目標賣出價、止損價。呢個 app 做嘅係「幾個星期」嘅波段，唔係今日炒明日，亦唔係拿住幾年。
        </p>
        <p className="leading-relaxed">
          如果現價已經高過買入區，我會寫「等回調」，唔會叫你現價追入。如果係跌勢，會直接話「現在不建議追買」，唔會扮可以抄到最底。
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-serif text-2xl">3. 圖表開關</h2>
        <p className="leading-relaxed">
          預設只打開：20天線、50天線、支撑／阻力、同三條計劃線。想睇波動帶（ATR）或者 RSI，自己打開就得。上面有 1M／3M／6M／1Y／5Y，波段通常睇 3 至 6 個月。
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-serif text-2xl">4. 詞彙</h2>
        <p className="leading-relaxed">
          見到有底線嘅字（例如 ATR、支撑、止損），撳一下就有白話解釋。完整清單喺{" "}
          <Link href="/terms" className="underline">
            詞彙頁
          </Link>
          。
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-serif text-2xl">5. 連接 Longbridge（可選）</h2>
        <p className="leading-relaxed">
          右上角「連接 Longbridge」會帶你去 Longbridge 登入授權。授權畫面如果有交易權限，請取消剔；呢個
          app 只會申請行情／K 線／股票資料，唔會申請落盤。
        </p>
        <p className="leading-relaxed">
          未連接都可以用：會改用公開延遲行情，三個價、圖表、詞彙同覆盤一樣齊。連接之後，港股同美股用即時 LV1
          報價同日K 再計三個價。登出只影響行情來源，唔會清走你嘅觀察名單或者覆盤紀錄。
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-serif text-2xl">6. 覆盤</h2>
        <p className="leading-relaxed">
          去{" "}
          <Link href="/replay" className="underline">
            覆盤
          </Link>
          ，揀一隻股票同一個舊日期。電腦會假裝自己只睇到嗰日，計出三個價，然後逐日播放後來發生嘅事。你可以睇到計劃成立、止損、未觸發，或者「先止損後先到目標」。紀錄存在你部手機／電腦裏面。
        </p>
      </section>

      <div className="mt-12">
        <Disclaimer />
      </div>
    </main>
  );
}
