import { Skeleton } from "@/components/ui/skeleton";

export function MedicineCardSkeleton() {
  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border border-brand-border-card bg-white p-3 shadow-sm">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}

export function MedicineGridSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <MedicineCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function CategoryChipSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-brand-tint-chip p-3">
      <Skeleton className="size-16 rounded-full" />
      <Skeleton className="h-5 w-28" />
    </div>
  );
}

export function CategoryGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <CategoryChipSkeleton key={index} />
      ))}
    </div>
  );
}
