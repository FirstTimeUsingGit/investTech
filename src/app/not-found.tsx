import Link from "next/link";
import { SearchBox } from "@/components/search-box";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-16">
      <h1 className="font-serif text-3xl font-semibold">呢頁唔存在</h1>
      <p className="mt-3 text-muted-foreground">可能係連結打錯。返去主頁搜尋股票就得。</p>
      <div className="mt-6">
        <SearchBox />
      </div>
      <Link href="/" className="mt-6 inline-block text-sm underline">
        返回主頁
      </Link>
    </main>
  );
}
