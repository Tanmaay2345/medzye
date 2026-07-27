"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/common/error-state";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-24">
      <ErrorState onRetry={reset} />
    </div>
  );
}
