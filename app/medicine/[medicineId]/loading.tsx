import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-[1196px] flex-1 flex-col gap-10 px-4 py-12 sm:px-6 lg:px-0">
      <div className="flex flex-col gap-10 lg:flex-row">
        <Skeleton className="aspect-square w-full rounded-xl lg:w-[471px]" />
        <div className="flex w-full flex-col gap-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}
