import type { Category } from "@/types/database";
import { EmptyState } from "@/components/common/empty-state";
import { CategoryChip } from "./category-chip";

export function CategoryGrid({ categories }: { categories: Category[] }) {
  if (categories.length === 0) {
    return (
      <EmptyState
        title="No categories yet"
        description="Categories added in Supabase will appear here automatically."
      />
    );
  }

  return (
    <div className="flex flex-wrap gap-4">
      {categories.map((category) => (
        <CategoryChip key={category.id} category={category} />
      ))}
    </div>
  );
}
