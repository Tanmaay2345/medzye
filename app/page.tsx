import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CategoryGrid } from "@/components/categories/category-grid";
import { MedicineGrid } from "@/components/cards/medicine-grid";
import { getCategories } from "@/lib/queries/categories";
import { getDailyEssentials } from "@/lib/queries/medicines";

export default async function HomePage() {
  const [categories, dailyEssentials] = await Promise.all([
    getCategories(),
    getDailyEssentials(),
  ]);

  return (
    <div className="flex min-h-full flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-[1196px] flex-1 flex-col gap-16 px-4 py-12 sm:px-6 lg:px-0">
        <section aria-labelledby="shop-by-category-heading" className="flex flex-col gap-6">
          <h2 id="shop-by-category-heading" className="text-2xl font-bold text-brand-gray-900">
            Shop by Category
          </h2>
          <CategoryGrid categories={categories} />
        </section>

        <section aria-labelledby="daily-essentials-heading" className="flex flex-col gap-6">
          <h2 id="daily-essentials-heading" className="text-2xl font-bold text-brand-gray-900">
            Buy Daily Essentials
          </h2>
          <MedicineGrid medicines={dailyEssentials} />
        </section>

        <section aria-labelledby="otc-guidelines-heading" className="flex flex-col gap-8">
          <h2 id="otc-guidelines-heading" className="text-2xl font-bold text-brand-gray-900">
            OTC Guidelines
          </h2>
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[641fr_539fr]">
            <div className="relative aspect-[641/416] w-full overflow-hidden rounded-xl">
              <Image
                src="/images/otc-guidelines-illustration.png"
                alt="Pharmacist helping a customer choose over-the-counter medicine"
                fill
                sizes="(min-width: 1024px) 641px, 100vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col gap-5">
              <div className="relative aspect-[479/253] w-full">
                <Image
                  src="/images/otc-guidelines-infographic.png"
                  alt="Consumers are knowledgeable about selecting over-the-counter medicines: they choose OTC based on symptoms, trust doctor's advice, and prefer OTC to Rx when available"
                  fill
                  sizes="(min-width: 1024px) 479px, 100vw"
                  className="object-contain"
                />
              </div>
              <Link
                href="/otc-guidelines"
                className="rounded-lg bg-brand-primary px-6 py-4 text-center font-semibold text-white underline underline-offset-4 transition-colors hover:bg-brand-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
              >
                Know more about OTC Guidelines
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer categories={categories} />
    </div>
  );
}
