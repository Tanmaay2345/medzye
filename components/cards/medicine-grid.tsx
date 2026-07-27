import { EmptyState } from "@/components/common/empty-state";
import type { MedicineWithPrice } from "@/types/database";
import { MedicineCard } from "./medicine-card";

export function MedicineGrid({
  medicines,
  emptyTitle = "No medicines yet",
  emptyDescription = "Medicines added in Supabase will appear here automatically.",
}: {
  medicines: MedicineWithPrice[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (medicines.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {medicines.map((medicine, index) => (
        <MedicineCard key={medicine.id} medicine={medicine} priority={index < 5} />
      ))}
    </div>
  );
}
