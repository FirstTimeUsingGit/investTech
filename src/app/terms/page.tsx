import { TERMS } from "@/lib/glossary";
import { Disclaimer } from "@/components/disclaimer";
import { GlossaryTerm } from "@/components/glossary-term";

export const metadata = {
  title: "詞彙",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 pb-16">
      <h1 className="font-serif text-4xl font-semibold tracking-tight">詞彙</h1>
      <p className="mt-3 text-muted-foreground leading-relaxed">
        全部用日常說話解釋。股票頁裏面有底線嘅字，撳一下都可以睇到同一段。唔使背，用到先知。
      </p>
      <ul className="mt-8 space-y-5">
        {TERMS.map((term) => (
          <li key={term.id} id={term.id} className="rounded-2xl bg-card px-5 py-4 ring-1 ring-foreground/8">
            <h2 className="font-serif text-xl">
              <GlossaryTerm id={term.id}>{term.title}</GlossaryTerm>
            </h2>
            <p className="mt-2 leading-relaxed">{term.body}</p>
          </li>
        ))}
      </ul>
      <div className="mt-10">
        <Disclaimer />
      </div>
    </main>
  );
}
