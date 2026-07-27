"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this content. Please try again.",
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-brand-border-card bg-white px-6 py-16 text-center",
        className
      )}
    >
      <AlertTriangle className="size-10 text-destructive" aria-hidden />
      <p className="font-semibold text-brand-gray-900">{title}</p>
      <p className="max-w-sm text-sm text-brand-gray-500">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} className="mt-2 rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90">
          Try again
        </Button>
      )}
    </div>
  );
}
