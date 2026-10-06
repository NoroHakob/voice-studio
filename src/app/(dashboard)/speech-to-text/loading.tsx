import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="ml-auto h-9 w-28" />
      </div>
      <div className="hidden w-105 flex-col gap-3 border-l p-6 lg:flex">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}
