import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MedicineGrid } from "@/components/cards/medicine-grid";
import { getCategories, getCategoryById } from "@/lib/queries/categories";
import { getMedicinesByCategory } from "@/lib/queries/medicines";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  const id = Number(categoryId);
  if (!Number.isFinite(id)) notFound();

  const [categories, category] = await Promise.all([
    getCategories(),
    getCategoryById(id),
  ]);

  if (!category) notFound();

  const medicines = await getMedicinesByCategory(id);

  return (
    <div className="flex min-h-full flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-[1196px] flex-1 flex-col gap-6 px-4 py-12 sm:px-6 lg:px-0">
        <h1 className="text-2xl font-bold text-brand-gray-900">
          {category.name ?? "Category"}
        </h1>
        <MedicineGrid
          medicines={medicines}
          emptyTitle={`No medicines in ${category.name ?? "this category"} yet`}
          emptyDescription="Medicines assigned to this category in Supabase will appear here automatically."
        />
      </main>

      <Footer categories={categories} />
    </div>
  );
}
