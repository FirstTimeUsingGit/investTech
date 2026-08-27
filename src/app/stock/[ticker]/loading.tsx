import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
      <Skeleton className="h-[340px] rounded-2xl" />
    </main>
  );
}
