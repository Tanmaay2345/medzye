import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/types/database";
import { resolveCategoryIcon } from "@/utils/resolve-category-icon";

export function CategoryChip({ category }: { category: Category }) {
  const resolvedIcon = resolveCategoryIcon(category.icon, category.name);

  return (
    <Link
      href={`/category/${category.id}`}
      className="flex min-h-[88px] w-full items-center gap-2 rounded-[12px] bg-brand-tint-chip py-3 pl-4 pr-5 transition-transform hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
    >
      <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-brand-tint-icon">
        {resolvedIcon.type === "image" ? (
          <span className="relative size-10">
            <Image src={resolvedIcon.src} alt="" fill sizes="40px" className="object-contain" />
          </span>
        ) : (
          <resolvedIcon.Icon className="size-8 text-brand-navy" aria-hidden />
        )}
      </span>
      <span className="text-[20px] font-medium tracking-[-0.4px] text-brand-navy">
        {category.name ?? "Untitled category"}
      </span>
    </Link>
  );
}
