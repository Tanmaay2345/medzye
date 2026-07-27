import Link from "next/link";
import { Construction } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getCategories } from "@/lib/queries/categories";

export async function ComingSoon({ title }: { title: string }) {
  const categories = await getCategories();

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-[1196px] flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center sm:px-6 lg:px-0">
        <Construction className="size-12 text-brand-primary" aria-hidden />
        <h1 className="text-2xl font-bold text-brand-navy">{title}</h1>
        <p className="max-w-md text-brand-gray-500">
          This page is coming soon. In the meantime, head back to the homepage to keep
          browsing and comparing medicine prices.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-lg bg-brand-primary px-5 py-2.5 font-medium text-white transition-colors hover:bg-brand-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
        >
          Back to Home
        </Link>
      </main>
      <Footer categories={categories} />
    </div>
  );
}
