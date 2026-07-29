import { ArrowRight } from "lucide-react";

/**
 * Same visual family as CategoryChip (bg/radius/padding/icon-circle/typography).
 * Functional: advances the featured-category carousel to the next page,
 * looping back to the first page after the last one.
 */
export function CategoryNextCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[88px] w-full items-center gap-2 rounded-[12px] bg-brand-tint-chip py-3 pl-4 pr-5 text-left transition-transform hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
    >
      <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-brand-tint-icon">
        <ArrowRight className="size-8 text-brand-navy" aria-hidden />
      </span>
      <span className="text-[20px] font-medium tracking-[-0.4px] text-brand-navy">Next</span>
    </button>
  );
}
