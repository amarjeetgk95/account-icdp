import { Skeleton } from '@/shared/components/Skeleton';

export function DashboardSkeleton() {
  return (
    <div className="flex h-full w-full flex-1 flex-col justify-between overflow-hidden gap-2 min-h-0">
      {/* Top Status Ticker Skeleton */}
      <Skeleton className="h-8 w-full shrink-0 rounded-lg" />

      {/* 4 Metric Tiles Skeleton */}
      <Skeleton className="h-16 w-full shrink-0 rounded-xl" />

      {/* Main Grid Skeleton */}
      <div className="grid flex-1 min-h-0 grid-cols-12 gap-2">
        <div className="col-span-8 flex flex-col gap-2 min-h-0">
          <Skeleton className="h-24 w-full shrink-0 rounded-xl" />
          <div className="grid flex-1 min-h-0 grid-cols-3 gap-2">
            <Skeleton className="h-full w-full rounded-xl" />
            <Skeleton className="h-full w-full rounded-xl" />
            <Skeleton className="h-full w-full rounded-xl" />
          </div>
        </div>
        <div className="col-span-4 min-h-0">
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
      </div>

      {/* Footer Skeleton */}
      <Skeleton className="h-5 w-full shrink-0 rounded" />
    </div>
  );
}
