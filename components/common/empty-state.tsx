import type { LucideIcon } from "lucide-react";
import { PackageSearch } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  icon: Icon = PackageSearch,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-brand-border-card bg-white px-6 py-16 text-center",
        className
      )}
    >
      <Icon className="size-10 text-brand-gray-400" aria-hidden />
      <p className="font-semibold text-brand-gray-900">{title}</p>
      {description && <p className="max-w-sm text-sm text-brand-gray-500">{description}</p>}
    </div>
  );
}
