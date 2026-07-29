"use client";

import { useState } from "react";
import type { Category } from "@/types/database";
import { CategoryChip } from "./category-chip";
import { CategoryNextCard } from "./category-next-card";

const PAGE_SIZE = 4;
const FEATURED_FIRST_PAGE = ["Cold & Cough", "First Aid", "Heart Care", "Diabetes"];

// Category names longer than this wrap to 2 lines at the base column width
// (measured: "Cold & Cough" needs ~126px of text space, the base column
// only gives ~112px). Those get a bit more width, taken from the Next card,
// keeping the row's total width unchanged — desktop only (lg:), so the
// mobile/tablet stacked layout is untouched.
const WIDE_NAME_THRESHOLD = 10;
const WIDE_BONUS_FR = 0.13;
const MIN_NEXT_FR = 0.6;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function buildColumnTemplate(pageCategories: Category[]): string {
  const categoryFrs = pageCategories.map((category) =>
    (category.name?.length ?? 0) > WIDE_NAME_THRESHOLD ? 1 + WIDE_BONUS_FR : 1
  );
  const nextFr = Math.max(MIN_NEXT_FR, 5 - categoryFrs.reduce((sum, fr) => sum + fr, 0));
  return [...categoryFrs, nextFr].map((fr) => `${fr}fr`).join(" ");
}

/**
 * Client-side paginated grid over categories already fetched server-side —
 * no refetching, no navigation. Page 1 is the featured 4 (Cold & Cough,
 * First Aid, Heart Care, Diabetes); "Next" pages through the remaining
 * categories 4 at a time and loops back to page 1 after the last page.
 */
export function FeaturedCategoryCarousel({ categories }: { categories: Category[] }) {
  const featured = FEATURED_FIRST_PAGE.map((name) =>
    categories.find((category) => category.name === name)
  ).filter((category) => category != null);
  const featuredIds = new Set(featured.map((category) => category.id));
  const remaining = categories.filter((category) => !featuredIds.has(category.id));

  const pages = [featured, ...chunk(remaining, PAGE_SIZE)].filter((page) => page.length > 0);
  const [pageIndex, setPageIndex] = useState(0);
  const currentPage = pages[pageIndex] ?? [];

  return (
    <div
      key={pageIndex}
      style={{ "--cat-cols": buildColumnTemplate(currentPage) } as React.CSSProperties}
      className="grid animate-in grid-cols-2 fade-in-0 slide-in-from-right-4 gap-4 duration-200 sm:grid-cols-3 lg:gap-6 lg:[grid-template-columns:var(--cat-cols)]"
    >
      {currentPage.map((category) => (
        <CategoryChip key={category.id} category={category} />
      ))}
      <CategoryNextCard onClick={() => setPageIndex((prev) => (prev + 1) % pages.length)} />
    </div>
  );
}
