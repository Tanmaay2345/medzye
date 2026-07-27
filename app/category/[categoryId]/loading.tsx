import { MedicineGridSkeleton } from "@/components/common/loading-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-[1196px] flex-1 flex-col gap-6 px-4 py-12 sm:px-6 lg:px-0">
      <MedicineGridSkeleton />
    </div>
  );
}
